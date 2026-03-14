# LangTeach SaaS

AI-powered lesson planning workspace for independent language teachers.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, TanStack Query, React Router 7 |
| Backend | .NET 9 Web API, Entity Framework Core 9, SQL Server 2022 |
| Auth | Auth0 (email/password + Google OAuth) |
| AI | Claude API (Anthropic) — Phase 2 |
| Infra | Azure Bicep (Container Apps, SQL, Static Web Apps, Key Vault, Blob Storage) |
| Testing | Vitest + Testing Library (frontend), xUnit + FluentAssertions (backend), Playwright (e2e) |

## Prerequisites

- Node.js 24+
- .NET 9 SDK
- Docker
- Auth0 account (free tier)

## Quick Start

```bash
# Start SQL Server + API
docker compose up sqlserver api -d

# Frontend (run directly — not via Docker, to pick up .env.local)
cd frontend
cp .env.local.example .env.local   # fill in Auth0 values — see Auth0 Setup below
npm install
npm run dev   # http://localhost:5173
```

API health check: http://localhost:5000/api/health
SQL Server: `localhost:1434` (user: `sa`, password from `.env`)

## Auth0 Setup (one-time, per developer)

1. Create an Auth0 tenant (free tier, EU region recommended)
2. Create a **Single Page Application** named `LangTeach Frontend` — note the Client ID
3. Set Allowed Callback/Logout/Web Origins to `http://localhost:5173`
4. Create an **API** (Applications > APIs) with identifier `https://api.langteach.io`
5. Under the SPA app > APIs tab, authorize the LangTeach API (toggle both User and Client access)
6. Enable Google social connection (Authentication > Social > Google)
7. Fill in `frontend/.env.local`:

```
VITE_AUTH0_DOMAIN=your-tenant.eu.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.langteach.io
VITE_API_BASE_URL=http://localhost:5000
```

8. Fill in `Auth0:Domain` in `backend/LangTeach.Api/appsettings.Development.json`

## Environment Variables

### Frontend (`frontend/.env.local`, git-ignored)

| Variable | Description |
|----------|-------------|
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | SPA application client ID |
| `VITE_AUTH0_AUDIENCE` | API identifier (`https://api.langteach.io`) |
| `VITE_API_BASE_URL` | Backend URL (default: `http://localhost:5000`) |

### Backend (`appsettings.Development.json`, git-tracked — no secrets)

| Key | Description |
|-----|-------------|
| `Auth0:Domain` | Auth0 tenant domain |
| `Auth0:Audience` | API identifier |
| `ConnectionStrings:Default` | SQL Server connection string |

Production secrets come from Azure Key Vault via `DefaultAzureCredential` — never hardcoded.

## Running Tests

```bash
# Backend
cd backend && dotnet test

# Frontend unit tests
cd frontend && npm test

# E2E (requires frontend running on :5173)
cd e2e && npx playwright test
```

## Logs

- **Backend**: console + `backend/LangTeach.Api/logs/api-YYYY-MM-DD.log` (rolling daily, via Serilog)
- **Frontend**: browser DevTools console — tagged `[TIMESTAMP] [LEVEL] [Context] message`

## Project Structure

```
langTeachSaaS/
├── frontend/                    # React + Vite
│   └── src/
│       ├── components/          # Layout, ProtectedRoute
│       ├── lib/                 # apiClient (Axios + auth interceptor), logger
│       ├── pages/               # Route-level components
│       └── main.tsx             # Auth0Provider entry point
├── backend/
│   ├── LangTeach.Api/           # .NET 9 Web API
│   │   ├── Controllers/         # AuthController, HealthController
│   │   ├── Data/                # EF Core DbContext
│   │   └── logs/                # Serilog rolling log files (git-ignored)
│   └── LangTeach.Api.Tests/     # xUnit integration tests
├── e2e/                         # Playwright end-to-end tests
│   └── tests/                   # auth-diagnostic.spec.ts + future tests
├── infra/                       # Azure Bicep IaC
│   ├── main.bicep
│   ├── parameters/              # dev.bicepparam, prod.bicepparam
│   └── modules/                 # sql, appservice, staticwebapp, storage, keyvault
├── plan/                        # Task plans
│   └── langteach-phase1/
└── docker-compose.yml           # SQL Server + API (frontend runs directly for dev)
```

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation (auth, profiles, lesson CRUD) | In progress |
| Phase 2 | AI Core (Claude integration, generation, streaming) | Planned |
| Phase 3 | Library & Export (snippets, PDF export) | Planned |
| Phase 4 | Monetization & Launch (Stripe, onboarding) | Planned |

### Phase 1 Tasks

| Task | Description | Status |
|------|-------------|--------|
| T1 | Repo & tooling setup (monorepo, Docker, React, .NET 9) | Done |
| T2 | Azure infrastructure (Bicep: Container Apps, SQL, SWA, Key Vault) | Done — PR #1 |
| T3 | Auth0 integration (JWT, Auth0Provider, Serilog, Playwright e2e) | Done — PR #2 |
| T4 | Database schema (EF Core migrations, Phase 1 tables, seed data) | Next |
| T5 | Teacher profile API + UI | Pending |
| T6 | Student profiles API + UI | Pending |
| T7 | Lesson CRUD API | Pending |
| T8 | Lesson UI (planner, editor) | Pending |
| T9 | CI/CD pipeline (GitHub Actions) | Pending |
