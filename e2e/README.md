# E2E Tests

## Two startup modes

### Mock-auth mode (fast, no Auth0)

Used by the `mock-auth` Playwright project. The backend runs with `ASPNETCORE_ENVIRONMENT=Testing`, which activates `E2ETestAuthHandler` (fixed identity: `auth0|e2e-test-teacher` / `e2e-test@langteach.io`). The frontend runs with `VITE_E2E_TEST_MODE=true`, which activates `MockAuth0Provider` (no Auth0 SDK calls).

Start the stack:

```bash
ASPNETCORE_ENVIRONMENT=E2ETesting docker compose up sqlserver api -d
cd frontend && npm run dev:e2e
```

Run mock-auth tests:

```bash
cd e2e && npx playwright test --project=mock-auth
```

### Real Auth0 mode

Used by the `parallel`, `serial`, and `destructive` Playwright projects. Requires real Auth0 credentials in `e2e/.env`:

```
E2E_TEST_EMAIL=...
E2E_TEST_PASSWORD=...
E2E_TEST_AUTH0_USER_ID=...
```

Start the stack:

```bash
docker compose up sqlserver api -d
cd frontend && npm run dev
```

Run all real-Auth0 tests:

```bash
cd e2e && npx playwright test --project=parallel --project=serial --project=destructive
```

## Test projects

| Project | Files | Auth | Notes |
|---|---|---|---|
| `mock-auth` | dashboard, lessons, students, typed-content-view, lesson-ai-generate, teacher-profile | Mock (no Auth0) | Fully parallel, 8 workers |
| `parallel` | all others except registration, provider-switch | Real Auth0 | 4 workers |
| `serial` | provider-switch | Real Auth0 | 1 worker, runs after parallel |
| `destructive` | registration | Real Auth0 | Deletes/recreates teacher record, runs last |
