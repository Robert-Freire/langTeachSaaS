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

## Playwright E2E
- Installed in `e2e/` folder, Chromium only
- Run: `cd e2e && npx playwright test`
- Current tests: `auth-diagnostic.spec.ts` (confirms login page loads)
- Planned for T4: `auth-helper.ts` — reusable authenticated browser context used by all future tests
- All tasks T5+ must ship a Playwright test using `auth-helper.ts`

## Logs
- Backend: `backend/LangTeach.Api/logs/api-YYYY-MM-DD.log` (rolling daily, Serilog)
- Frontend: browser DevTools console, prefixed `[TIMESTAMP] [LEVEL] [Context]`
