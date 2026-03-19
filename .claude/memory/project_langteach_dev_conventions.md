---
name: LangTeach SaaS — Dev Workflow Conventions
description: How to run the stack locally and important dev environment decisions
type: project
---

## Local Dev Workflow

**Frontend runs OUTSIDE Docker** — always via `npm run dev` directly.
Reason: Vite does not pick up `.env.local` inside Docker containers. Env vars would need to be injected separately, which is unnecessary complexity for dev.

```bash
# Start SQL Server + API only
docker compose up sqlserver api -d

# Frontend separately (picks up .env.local correctly)
cd frontend && npm run dev   # http://localhost:5173
```

**Never use `docker compose up --build -d` for all services** during development — the frontend container won't have Auth0 env vars.

## Ports
- Frontend: http://localhost:5173
- API: http://localhost:5000
- SQL Server: localhost:1434 (sa password from `.env`)

## Auth0 Tenant (dev)
- Domain: `langteach-dev.eu.auth0.com`
- Audience: `https://api.langteach.io`
- SPA Client ID: in `frontend/.env.local` (VITE_AUTH0_CLIENT_ID)
- Secret values stored in 1Password under `LangTeach Dev`

## Auth0 Gotcha — API Authorization
When creating a new Auth0 API and authorizing it for the SPA application, you must enable **BOTH**:
- User Access (toggle on the APIs tab of the SPA application)
- Client Access (same tab)

Enabling only one gives: `Client is not authorized to access resource server "https://api.langteach.io"` — no hint about which toggle is missing.

## E2E Testing — Docker Compose (Preferred)

The project has a fully containerized e2e stack in `docker-compose.e2e.yml` with project name `langteachsaas-e2e` (isolated from the dev stack).

**Setup (one-time):**
```powershell
cp .env.e2e.example .env.e2e   # fill in secrets from 1Password
```

**Run e2e tests:**
```powershell
docker compose -f docker-compose.e2e.yml --env-file .env.e2e up --build --exit-code-from playwright
```

**Wipe state between runs (fresh DB):**
```powershell
docker compose -f docker-compose.e2e.yml --env-file .env.e2e down -v
```

**Services:** sqlserver, api (ASPNETCORE_ENVIRONMENT=E2ETesting, bypasses JWT validation), frontend (Vite dev server on port 5174), playwright (runs tests, outputs to `e2e/test-results/` and `e2e/playwright-report/`).

**Environment variables:** All sourced from `.env.e2e` (see `.env.e2e.example` for the full list). Key vars: SA_PASSWORD, AUTH0_DOMAIN, AUTH0_AUDIENCE, VITE_AUTH0_CLIENT_ID, CLAUDE_API_KEY, E2E_TEST_EMAIL, E2E_TEST_PASSWORD, E2E_TEST_AUTH0_USER_ID.

**CI=true on playwright service:** Skips Auth0-dependent tests (registration, auth-me, auth-diagnostic) that require a real browser session. Those run only locally or in nightly CI with injected credentials.

**Parallel agent isolation:** When multiple agents run e2e tests from different worktrees, use `--project-name langteachsaas-e2e-<worktree-name>` to give each its own Docker network and volumes, avoiding conflicts. Single-agent runs can use the default project name.

## E2E Testing — Local (Alternative)

For running individual tests outside Docker:
```powershell
cd e2e && npx playwright test
```

Requires the dev stack (sqlserver + api + frontend) to be running locally.

## AI Integration Tests

Tests decorated with `[SkipIfNoClaudeApiKey]` are **opt-in only** — skipped by default in CI and plain `dotnet test` runs.

To run them locally (hits Claude API, consumes tokens):
```powershell
$env:AI_INTEGRATION_TESTS = "1"; dotnet test --project backend/LangTeach.Api.Tests
```

All AI integration tests use `ClaudeModel.Haiku` regardless of the production model, to minimize cost.
The Claude API key is read from .NET user secrets (set via `dotnet user-secrets set "Claude:ApiKey" "sk-ant-..."`) — never committed to the repo.

## Logs
- Backend: `backend/LangTeach.Api/logs/api-YYYY-MM-DD.log` (rolling daily, Serilog)
- Frontend: browser DevTools console, prefixed `[TIMESTAMP] [LEVEL] [Context]`
