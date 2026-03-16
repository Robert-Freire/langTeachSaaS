# E2E Testing Architecture Analysis

## Current State

15 e2e tests, all hitting real Auth0 and real Anthropic API. Three execution phases:
- **parallel** (4 workers): 12 tests that don't mutate shared state
- **serial**: teacher-profile, provider-switch (depend on stable teacher record)
- **destructive**: registration (deletes and recreates teacher, runs last)

### Root Causes of Flakiness (now fixed)

| Test | Root cause | Fix applied |
|------|-----------|-------------|
| auth-me, registration | Auth0 `/userinfo` rate-limited under parallel load, returns empty email | UserInfoService retries (3 attempts), AuthController DB email fallback |
| lessons | Auto-save PUT slow under load, 5s timeout too tight | Increased to UI_TIMEOUT (10s) |
| teacher-profile | (1) React Query refetch overwrites form input via useEffect race; (2) Registration test deleted teacher before this test ran | (1) Wait for form population + networkidle; (2) Registration moved to destructive group, runs last |
| lesson-ai-generate, typed-content-view | Registration deleting teacher mid-run caused cascading 404s | Registration moved to destructive group |

## Problem: External Dependency Coupling

Every authenticated e2e test does a real Auth0 login (browser redirect, form fill, token exchange). This means:
- 10+ simultaneous Auth0 round-trips under parallel load
- Rate limiting from Auth0's `/userinfo` endpoint
- ~3s overhead per test just for authentication
- Tests that verify business logic (CRUD, UI rendering) fail for auth infrastructure reasons

The Anthropic API dependency is narrower (only lesson-ai-generate, typed-content-view) but adds similar brittleness: slow streaming responses, occasional 429s.

## Recommended Architecture: Mock-Auth Test Bypass

### Concept

Add a **test-only auth bypass** that skips Auth0 login entirely. The frontend injects a synthetic JWT; the backend validates it with a test key. Business-logic tests use the bypass. A small set of "integration smoke" tests keep using real Auth0.

### Implementation Sketch

**Backend** (already partially exists):
- `TestAuthHandler` is already wired for integration tests. Extend it to work in a `Testing` environment mode (env var).
- When `LANGTEACH_ENV=testing`, accept tokens signed with a known test key instead of validating against Auth0 JWKS.

**Frontend**:
- Add a `test-login.ts` helper that injects a synthetic access token into `localStorage` (the same location Auth0 SDK stores it), skipping the Auth0 redirect flow entirely.
- Or: bypass the Auth0 SDK at the provider level by checking an env var.

**Playwright helpers**:
- `createMockAuthContext(browser)`: creates a context with the synthetic token pre-loaded. No Auth0 redirect, no network call. ~0ms auth overhead.
- `createAuthenticatedContext(browser)`: kept for real Auth0 smoke tests.

### Proposed Test Split

| Category | Auth method | Tests | Purpose |
|----------|------------|-------|---------|
| Business logic | Mock auth | dashboard, lessons, students, teacher-profile, typed-content-view, lesson-ai-generate | Test UI + API behavior without Auth0 dependency |
| Auth integration | Real Auth0 | auth-me, registration, auth-diagnostic, provider-switch | Test that Auth0 login, token exchange, email resolution actually work |

### Benefits

- **Faster**: mock-auth tests skip ~3s Auth0 login per test
- **Stable**: no Auth0 rate limiting, no `/userinfo` failures
- **Parallelizable**: mock-auth tests can run with higher parallelism (8+ workers) since Auth0 isn't a bottleneck
- **AI tests still work**: mock auth is orthogonal to the Anthropic API dependency

### Effort Estimate

- Backend: small change to `Program.cs` to conditionally register test auth handler
- Frontend: new `test-login.ts` helper (~30 lines), minor Auth0Provider wrapper change
- Playwright: new `createMockAuthContext` helper (~20 lines)
- Test migration: update 8 test files to use `createMockAuthContext`

### For Anthropic API

A similar mock approach could replace real Claude API calls in `lesson-ai-generate` and `typed-content-view` tests. The backend already has the `IClaudeApiClient` interface, so injecting a mock that returns canned responses is straightforward. This would eliminate the remaining external dependency and make the full suite runnable offline.

## Decision Points

1. **When to implement**: After the current feature branch merges. This is a testing infrastructure task, not a feature.
2. **Mock Auth0 or mock the SDK?**: Mocking at the backend level (test auth handler) is simpler and already proven. Frontend-level mocking requires touching the Auth0 SDK integration.
3. **Keep real Auth0 tests?**: Yes, but limit to 3-4 tests that specifically validate the auth flow. Run them serially to avoid rate limiting.
