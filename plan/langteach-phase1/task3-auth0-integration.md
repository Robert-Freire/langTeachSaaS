# T3 — Auth0 Setup & Integration (COMPLETED 2026-03-14)

**Phase**: 1 — Foundation
**Priority**: Must
**Effort**: 1 day
**Branch**: `task/t3-auth0-integration`
**PR**: #2
**Depends on**: T1 (repo structure), T2 (Azure infra + Key Vault exists)
**Blocks**: T5, T6, T7, T8 (all feature work requires auth working)

## Deviations from Plan

- **Auth loop bug**: `loginWithRedirect()` called during render caused an infinite redirect loop. Fixed by moving to `useEffect` and skipping the redirect when OAuth callback params (`code`/`error`) are present in the URL.
- **Auth0 portal gotcha**: The SPA must have both **User Access** and **Client Access** authorized under the LangTeach API — authorizing only one causes an immediate `not authorized to access resource server` error before the login page loads.
- **Logging added (beyond plan scope)**: Serilog (console + rolling file) added to backend; `logger.ts` utility added to frontend. Both needed to diagnose the redirect loop without manual browser testing.
- **Playwright e2e added (beyond plan scope)**: `e2e/` folder with Chromium installed. `auth-diagnostic.spec.ts` used to diagnose and verify the auth flow. Confirmed login page loads correctly.

---

## Goal

A teacher can register with email/password or Google OAuth, log in, and be recognised by the API from their JWT. The backend auto-creates a `Teacher` DB record on first login using the Auth0 `sub` claim.

---

## Pre-checks (before starting)

- [ ] T1 branch merged to main
- [ ] T2 branch merged to main (Key Vault `kv-lt-dev-5ba22u` exists in Azure)
- [ ] Auth0 account created (free tier, EU region)

---

## Step 1 — Auth0 Tenant Configuration (manual, portal)

1. Create Auth0 tenant (name: `langteach-dev`, region: EU)
2. **Application — SPA (React frontend):**
   - Type: Single Page Application
   - Allowed Callback URLs: `http://localhost:5173, https://<SWA-URL>`
   - Allowed Logout URLs: `http://localhost:5173, https://<SWA-URL>`
   - Allowed Web Origins: `http://localhost:5173, https://<SWA-URL>`
3. **API registration:**
   - Name: `LangTeach API`
   - Identifier (audience): `https://api.langteach.io`
   - Signing Algorithm: RS256
4. **Social connection:** Enable Google OAuth (Auth0 dev keys are fine for beta)
5. **Note down and store in 1Password:**
   - Domain: `<tenant>.auth0.com`
   - Client ID (SPA app)
   - Audience: `https://api.langteach.io`

---

## Step 2 — Backend (.NET 9)

### 2a. NuGet packages

```bash
cd backend
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Azure.Extensions.AspNetCore.Configuration.Secrets
dotnet add package Azure.Identity
```

Verify these are not already present in the `.csproj` before adding.

### 2b. `appsettings.Development.json` additions

```json
{
  "Auth0": {
    "Domain": "<tenant>.auth0.com",
    "Audience": "https://api.langteach.io"
  },
  "KeyVault": {
    "Uri": ""
  }
}
```

Client ID is not needed by the backend — do not add it here.

### 2c. `Program.cs` — Key Vault + authentication

```csharp
// Key Vault integration (deferred from T2)
if (!builder.Environment.IsDevelopment())
{
    var kvUri = builder.Configuration["KeyVault:Uri"]
                ?? throw new InvalidOperationException("KeyVault:Uri not configured");
    builder.Configuration.AddAzureKeyVault(new Uri(kvUri), new DefaultAzureCredential());
}

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://{builder.Configuration["Auth0:Domain"]}/";
        options.Audience = builder.Configuration["Auth0:Audience"];
        options.TokenValidationParameters = new TokenValidationParameters
        {
            NameClaimType = ClaimTypes.NameIdentifier
        };
    });

builder.Services.AddAuthorization();
```

Middleware order in pipeline (after `UseRouting`, before `MapControllers`):

```csharp
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
```

### 2d. Global authorize filter

```csharp
builder.Services.AddControllers(options =>
    options.Filters.Add(new AuthorizeFilter()));
```

Add `[AllowAnonymous]` to the health/probe endpoint only.

### 2e. CORS

```csharp
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(
                  "http://localhost:5173",
                  "https://<SWA-URL>")
              .AllowAnyHeader()
              .AllowAnyMethod()));
```

### 2f. `GET /api/auth/me` endpoint

This is the only endpoint implemented in T3. It validates the token and auto-upserts the teacher record. Full `Teacher` entity and EF migrations come in T4 — for now, stub the DB write behind an interface so T4 can wire it up without touching this endpoint.

```csharp
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    [HttpGet("me")]
    public IActionResult Me()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value ?? "";
        // T4 will inject ITeacherRepository and upsert here
        return Ok(new { sub, email });
    }
}
```

### 2g. Unit test

Add one test to verify a request without a token returns 401, and one integration test with a mock JWT returns 200. Use `WebApplicationFactory` and a test JWT signed with a known key.

---

## Step 3 — Frontend (React)

### 3a. Verify packages

`@auth0/auth0-react` should already be in `package.json` from T1. If not:

```bash
cd frontend
npm install @auth0/auth0-react
```

### 3b. Environment variables

Create `frontend/.env.local` (already git-ignored via `.gitignore`):

```
VITE_AUTH0_DOMAIN=<tenant>.auth0.com
VITE_AUTH0_CLIENT_ID=<spa-client-id>
VITE_AUTH0_AUDIENCE=https://api.langteach.io
VITE_API_BASE_URL=http://localhost:5000
```

### 3c. `main.tsx` — wrap app in `Auth0Provider`

```tsx
import { Auth0Provider } from '@auth0/auth0-react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Auth0Provider
    domain={import.meta.env.VITE_AUTH0_DOMAIN}
    clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    }}
  >
    <App />
  </Auth0Provider>
);
```

### 3d. Axios interceptor — `src/lib/apiClient.ts`

```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export function setupAuthInterceptor(getAccessToken: () => Promise<string>) {
  apiClient.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}
```

Call `setupAuthInterceptor` once in `App.tsx` after `Auth0Provider` is mounted, passing `getAccessTokenSilently` from `useAuth0()`.

### 3e. `ProtectedRoute` component — `src/components/ProtectedRoute.tsx`

```tsx
import { useAuth0 } from '@auth0/auth0-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) return <div>Loading…</div>;
  if (!isAuthenticated) {
    loginWithRedirect();
    return null;
  }
  return <>{children}</>;
}
```

Wrap all authenticated routes in `<ProtectedRoute>` in the router config.

### 3f. Login / logout UI

- Login: `loginWithRedirect()` from `useAuth0()`
- Logout: `logout({ logoutParams: { returnTo: window.location.origin } })`
- Display: `user.email` or `user.name` from `useAuth0()` in the nav

---

## Step 4 — Key Vault secrets (manual)

Store in Key Vault `kv-lt-dev-5ba22u` via Azure Portal or CLI (run by user):

```bash
az keyvault secret set --vault-name kv-lt-dev-5ba22u --name "Auth0--Domain" --value "<tenant>.auth0.com"
az keyvault secret set --vault-name kv-lt-dev-5ba22u --name "Auth0--Audience" --value "https://api.langteach.io"
```

Add `KeyVault:Uri` as a plain Container App environment variable (not a secret):
Value: `https://kv-lt-dev-5ba22u.vault.azure.net/`

---

## Pre-push Checklist

- [ ] `az bicep build --file infra/main.bicep` — zero warnings, zero errors
- [ ] `cd backend && dotnet build` — zero warnings, zero errors
- [ ] `cd backend && dotnet test` — all tests pass
- [ ] `cd frontend && npm run build` — zero errors

---

## Definition of Done

1. `GET /api/health` returns 200 with no token
2. `GET /api/auth/me` returns 401 with no token
3. `GET /api/auth/me` returns 200 with a valid Auth0 JWT (verified via Postman or curl)
4. Frontend: clicking Login redirects to Auth0 Universal Login
5. After email/password login, frontend shows user email in nav and redirects to `/dashboard`
6. After Google login, same result
7. Logout clears session and returns to home page
8. Network tab confirms every API request carries `Authorization: Bearer <token>`
