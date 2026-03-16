# Task: Mock-Auth E2E Testing Architecture

## Goal

Decouple 6 business-logic e2e tests from Auth0. Also migrate all DB helper calls away from Auth0Id-based lookups to email-based lookups wherever possible.

**Identity convention**: DB helpers use **email** as the stable identifier. Fixed e2e teacher email: `e2e-test@langteach.io`.

## Current State

- 10 spec files in `e2e/tests/`
- All authenticated tests call `createAuthenticatedContext()` — full Auth0 browser login (~3s per test, rate-limited under parallelism)
- `TestAuthHandler` exists in `LangTeach.Api.Tests/Fixtures/TestAuthHandler.cs` (integration tests only)
- Backend `Program.cs` already branches on `ASPNETCORE_ENVIRONMENT=Testing` (Key Vault, migrations)
- `Teacher.IsApproved` defaults `false`; `GenerateController` gates AI generation on `IsApproved`
- `db-helper.ts` already has `deleteTeacherByEmail` — `registration.spec.ts` just isn't using it yet

## Auth0Id Usage Audit

| File | Current usage | Action |
|------|--------------|--------|
| `registration.spec.ts` | `deleteTeacherByAuth0Id(sub)` | Replace with `deleteTeacherByEmail(email)` — email already in `meRes.json()` |
| `provider-switch.spec.ts` | `getTestAuth0UserId()` for `expect(me.sub).toBe(auth0UserId)` | Keep — legitimately tests Auth0 identity assertion |
| `lesson-ai-generate.spec.ts` | `approveTeacherByAuth0Id(getTestAuth0UserId())` | Replaced by mock-auth migration |
| `typed-content-view.spec.ts` | `approveTeacherByAuth0Id(getTestAuth0UserId())` | Replaced by mock-auth migration |

## Design Decisions

1. **Backend**: When `ASPNETCORE_ENVIRONMENT=Testing`, register `E2ETestAuthHandler` as the *only* auth scheme via an if/else conditional block — not added on top of JWT Bearer.
2. **Frontend**: `MockAuth0Provider` uses `{ ...initialContext, ...overrides }` spread (both `Auth0Context` and `initialContext` are named exports from `@auth0/auth0-react`) to satisfy the full `Auth0ContextInterface` without listing all ~15 methods manually.
3. **`setupMockTeacher`**: Must explicitly set `Authorization: Bearer test-token` in `page.request.get()` — Playwright's request API does not inherit the Axios interceptor.
4. **Teacher approval**: `setupMockTeacher` calls `GET /api/auth/me` (triggers upsert) then `approveE2ETestTeacher()` (email-keyed SQL). Required for AI generation tests.

## Test Split

| Group | Auth | Tests |
|-------|------|-------|
| mock-auth (8 workers) | Mock | dashboard, lessons, students, teacher-profile, typed-content-view, lesson-ai-generate |
| parallel (4 workers) | Real Auth0 | auth-diagnostic, auth-me |
| serial | Real Auth0 | provider-switch |
| destructive | Real Auth0 | registration |

## Implementation Steps

### Step 1: Backend — E2ETestAuthHandler + Program.cs restructure

**New file** `backend/LangTeach.Api/Auth/E2ETestAuthHandler.cs` (namespace `LangTeach.Api.Auth`):
- Adapt from `LangTeach.Api.Tests/Fixtures/TestAuthHandler.cs`
- Fixed identity — no header parsing: auth0Id=`auth0|e2e-test-teacher`, email=`e2e-test@langteach.io`, name=`"E2E Teacher"`
- Constructor: `(IOptionsMonitor<AuthenticationSchemeOptions>, ILoggerFactory, UrlEncoder)`
- Claims: `ClaimTypes.NameIdentifier`, `ClaimTypes.Email`, `ClaimTypes.Name`, scheme=`"Test"`

**Modify** `backend/LangTeach.Api/Program.cs` — replace the unconditional `AddAuthentication(...)` block (lines 52-61):

```csharp
if (builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddAuthentication("Test")
        .AddScheme<AuthenticationSchemeOptions, E2ETestAuthHandler>("Test", _ => { });
}
else
{
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
}
```

Add `using LangTeach.Api.Auth;` at the top. `System.Security.Claims` is already imported.

### Step 2: Frontend — MockAuth0Provider

**New file** `frontend/src/test-utils/MockAuth0Provider.tsx`:
- Import `Auth0Context`, `initialContext`, `Auth0ContextInterface` from `@auth0/auth0-react`
- Mock value: spread `initialContext`, override only what the app uses:
  ```tsx
  const mockValue = {
    ...initialContext,
    isAuthenticated: true,
    isLoading: false,
    error: undefined,
    user: { sub: 'auth0|e2e-test-teacher', email: 'e2e-test@langteach.io', name: 'E2E Teacher' },
    loginWithRedirect: async () => {},
    getAccessTokenSilently: async () => 'test-token',
  }
  ```
- Render: `<Auth0Context.Provider value={mockValue as Auth0ContextInterface}>{children}</Auth0Context.Provider>`

**New file** `frontend/.env.e2e`:
```
VITE_E2E_TEST_MODE=true
VITE_API_URL=http://localhost:5000
VITE_AUTH0_DOMAIN=langteach-dev.eu.auth0.com
VITE_AUTH0_CLIENT_ID=placeholder
VITE_AUTH0_AUDIENCE=https://api.langteach.io
```

**Modify** `frontend/.gitignore` — add `.env.e2e` entry (current `*.local` pattern doesn't cover it).

**Modify** `frontend/src/main.tsx`:
- Import `MockAuth0Provider`
- Branch on `import.meta.env.VITE_E2E_TEST_MODE === 'true'` to render `<MockAuth0Provider>` vs `<Auth0Provider>`

**Modify** `frontend/package.json` — add `"dev:e2e": "vite --mode e2e"`.

### Step 3: Playwright — Helpers + Config

**Modify** `e2e/helpers/auth-helper.ts` — add:
```ts
export async function createMockAuthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('http://localhost:5173')
  await page.waitForURL('http://localhost:5173/**', { timeout: 10000 })
  await page.close()
  return context
}
```

**Modify** `e2e/helpers/db-helper.ts` — add (hardcoded constant, no env var):
```ts
const E2E_TEST_EMAIL = 'e2e-test@langteach.io'

export async function resetE2ETestTeacher(): Promise<void>
// DELETE FROM Teachers WHERE Email = @email

export async function approveE2ETestTeacher(): Promise<void>
// UPDATE Teachers SET IsApproved = 1 WHERE Email = @email
```
Follow the same connection pool open/close pattern as existing functions.

**New file** `e2e/helpers/mock-teacher-helper.ts`:
```ts
import { Page } from '@playwright/test'
import { approveE2ETestTeacher } from './db-helper'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

export async function setupMockTeacher(page: Page): Promise<void> {
  // Must pass Authorization header explicitly — page.request has no Axios interceptor
  const res = await page.request.get(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  if (!res.ok()) throw new Error(`setupMockTeacher: /api/auth/me returned ${res.status()}`)
  await approveE2ETestTeacher()
}
```

**Modify** `e2e/playwright.config.ts`:
- Add `mock-auth` project — explicit `testMatch` array (6 paths, not glob alternation), `fullyParallel: true`, `workers: 8`, no `dependencies`
- Update `parallel` `testIgnore` to also exclude the 6 mock-auth files
- `serial` `testMatch` changes from `['**/teacher-profile.spec.ts', '**/provider-switch.spec.ts']` to `['**/provider-switch.spec.ts']` only

### Step 4: Migrate 6 test files

For each of the 6 tests:
1. Replace `createAuthenticatedContext` with `createMockAuthContext`
2. Remove `approveTeacherByAuth0Id` / `getTestAuth0UserId` imports (where present)
3. Add `setupMockTeacher` import from `../helpers/mock-teacher-helper`
4. Add `test.beforeAll(async ({ browser }) => { ... })`: create context → open page → `setupMockTeacher(page)` → close page

`teacher-profile.spec.ts` `beforeAll`: `resetE2ETestTeacher()` first, then open page + `setupMockTeacher(page)`.

### Step 5: Fix registration.spec.ts (email-based delete)

**Modify** `e2e/tests/registration.spec.ts`:
- Change import: `deleteTeacherByAuth0Id` → `deleteTeacherByEmail` (`deleteTeacherByEmail` already exists in `db-helper.ts`)
- At line 38, also destructure `email`: `const { sub, email } = await meRes.json() as { sub: string; email: string }`
- At line 45, change `deleteTeacherByAuth0Id(sub)` → `deleteTeacherByEmail(email)`

### Step 6: Dev startup docs

Update/create `e2e/README.md`:
- Mock-auth mode: `ASPNETCORE_ENVIRONMENT=Testing docker compose up sqlserver api -d` + `cd frontend && npm run dev:e2e`
- Real-Auth0 mode: normal API + `npm run dev` + `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`

## Files Modified

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Auth/E2ETestAuthHandler.cs` | New |
| `backend/LangTeach.Api/Program.cs` | Auth registration → conditional if/else |
| `frontend/src/test-utils/MockAuth0Provider.tsx` | New — `Auth0Context.Provider` + `initialContext` spread |
| `frontend/src/main.tsx` | Conditional provider |
| `frontend/.env.e2e` | New env file |
| `frontend/.gitignore` | Add `.env.e2e` |
| `frontend/package.json` | Add `dev:e2e` script |
| `e2e/helpers/auth-helper.ts` | Add `createMockAuthContext` |
| `e2e/helpers/db-helper.ts` | Add `resetE2ETestTeacher`, `approveE2ETestTeacher` |
| `e2e/helpers/mock-teacher-helper.ts` | New — `setupMockTeacher` with explicit auth header |
| `e2e/playwright.config.ts` | Add mock-auth project; update parallel/serial |
| `e2e/tests/dashboard.spec.ts` | Mock auth |
| `e2e/tests/lessons.spec.ts` | Mock auth |
| `e2e/tests/students.spec.ts` | Mock auth |
| `e2e/tests/teacher-profile.spec.ts` | Mock auth + reset |
| `e2e/tests/typed-content-view.spec.ts` | Mock auth; remove Auth0Id DB calls |
| `e2e/tests/lesson-ai-generate.spec.ts` | Mock auth; remove Auth0Id DB calls |
| `e2e/tests/registration.spec.ts` | `deleteTeacherByAuth0Id` → `deleteTeacherByEmail` |

## Out of Scope

- Mocking the Anthropic API
- CI pipeline configuration
- `provider-switch.spec.ts` Auth0Id usage — legitimately tests identity assertion, not a lookup key
