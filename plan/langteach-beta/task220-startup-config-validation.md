# Task #220: Add Startup Config Validation

## Issue
#220 — Add startup config validation to prevent silent crashes from missing secrets

## Context
PR #148 registered `BlobServiceClient` with `builder.Configuration["AzureBlobStorage:ConnectionString"]` (no null guard). When the secret was missing from Key Vault, the app crashed silently with `ArgumentNullException` at first request rather than failing fast on startup. This caused hours of downtime (#217).

## Approach

### 1. Fix BlobServiceClient null guard (specific fix)
Replace the current registration in `Program.cs`:
```csharp
builder.Services.AddSingleton(_ =>
    new BlobServiceClient(builder.Configuration["AzureBlobStorage:ConnectionString"]));
```
With a guard that throws `InvalidOperationException` with a descriptive message if the connection string is missing. Skip validation in E2ETesting environment (blob storage is not used there).

### 2. Add general startup config validation
Create a `StartupConfigValidator` extension method in `LangTeach.Api/Infrastructure/StartupConfigValidator.cs` that:
- Accepts a list of required config key-value checks
- Logs ALL missing keys together (not one at a time)
- Throws a single `InvalidOperationException` listing every missing key
- Called from `Program.cs` **after the Key Vault block** (so production secrets are loaded into `IConfiguration`) and **before any service registration** (so the app never binds the port if config is invalid)

Required keys to validate (outside dev/E2ETesting):
- `ConnectionStrings:Default` (SQL Server)
- `Auth0:Domain`
- `Auth0:Audience`
- `Claude:ApiKey`
- `AzureBlobStorage:ConnectionString`

In dev/E2ETesting: skip the validation (appsettings.Development.json and test env handle config locally, no Key Vault).

### 3. Fix DB connection string fallback
Current: `GetConnectionString("Default") ?? ""` — empty string doesn't fail fast, just fails on first DB call.
Change to: `GetConnectionString("Default") ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.")` — but only outside dev/E2ETesting (dev uses local SQL Server, which is always present).

Actually, the startup validator above covers this. The validator will catch the missing key before service registration. So we don't need to change the DB registration — the validator throws before we get there.

### 4. Audit other config reads
Review `Program.cs` for other `builder.Configuration[...]` reads that lack null guards:
- `AllowedOrigins:Swa`, `AllowedOrigins:E2e` — already filtered with `Where(!IsNullOrWhiteSpace)`, safe
- `KeyVault:Uri` — already has `?? throw`, safe
- `Auth0:Domain`, `Auth0:Audience` — used inline in JWT options, no null guard. Covered by startup validator.
- `Claude:ApiKey` — inside `ClaudeClientOptions`, bound via `Configure<>` (not `AddOptions<>...ValidateDataAnnotations().ValidateOnStart()`). Adding `[Required]` alone would be a silent no-op. Covered by the startup validator in section 2 — no change needed to `ClaudeClientOptions`.

### 5. Unit test
Add `StartupConfigValidatorTests.cs` in `LangTeach.Api.Tests/Infrastructure/`:
- Test: all keys present → no exception
- Test: one key missing → exception message names the missing key
- Test: multiple keys missing → exception message names all missing keys

## Files to change
- `backend/LangTeach.Api/Program.cs` — call validator (after Key Vault block, before services), fix BlobServiceClient guard
- `backend/LangTeach.Api/Infrastructure/StartupConfigValidator.cs` — new file
- `backend/LangTeach.Api.Tests/Infrastructure/StartupConfigValidatorTests.cs` — new test file

## Environment behavior
| Environment | Validation runs |
|---|---|
| Development | No (appsettings.Development.json present) |
| E2ETesting | No (mock config, no Key Vault) |
| Testing | No (unit test environment) |
| Production / Staging | Yes (Key Vault required) |

## Acceptance Criteria (from issue)
- [x] BlobServiceClient throws `InvalidOperationException` with descriptive message when connection string is null
- [x] Audit complete: other silent-null config reads in Program.cs fixed
- [x] App logs all missing config keys by name
- [x] App fails fast before binding the port
- [x] Validation runs in all non-dev/non-test environments
- [x] Config keys list is in a single maintainable place
- [x] Optional services (blob storage) can degrade gracefully OR fail fast with a clear message (we choose fail fast with clear message — degrading gracefully adds complexity for a required production dependency)
- [x] Unit test covers missing config case
