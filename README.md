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

## First-Time Setup

### 1. Root `.env` (docker-compose secrets)

```bash
cp .env.example .env
```

Fill in `.env`:

```
SA_PASSWORD=<choose a strong password>
AUTH0_DOMAIN=your-tenant.eu.auth0.com
AUTH0_AUDIENCE=https://api.langteach.io
```

### 2. Frontend `.env.local` (Auth0 + API URL)

```bash
cp frontend/.env.local.example frontend/.env.local
```

Fill in `frontend/.env.local`:

```
VITE_AUTH0_DOMAIN=your-tenant.eu.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.langteach.io
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Auth0 tenant (one-time)

1. Create an Auth0 tenant (free tier, EU region recommended)
2. Create a **Single Page Application** named `LangTeach Frontend` — note the Client ID
3. Set Allowed Callback URLs, Logout URLs, and Web Origins to `http://localhost:5173`
4. Create an **API** (Applications > APIs) with identifier `https://api.langteach.io`
5. Enable Google social connection (Authentication > Social > Google)

### 4. E2E test user (one-time, for Playwright)

The Playwright tests log in with a dedicated test account — never your personal account.

1. In the Auth0 dashboard, go to **User Management > Users > Create User**
2. Set email to something like `e2e-test@langteach.dev`, choose a strong password, connection: `Username-Password-Authentication`
3. Fill in `e2e/.env` (copy from `e2e/.env.example` if it doesn't exist):

```
E2E_TEST_EMAIL=e2e-test@langteach.dev
E2E_TEST_PASSWORD=<the password you set>
```

> `e2e/.env` is git-ignored. Never commit it.

## Running Locally

### Option A — API + SQL in Docker, frontend on host (recommended for development)

```bash
# Start SQL Server + API
docker compose up sqlserver api -d

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:5173
```

API: http://localhost:5000/api/health
SQL Server: `localhost:1434` (user: `sa`, password from `.env`)

### Option B — Everything in Docker

```bash
docker compose up -d
```

Frontend: http://localhost:5173 (HMR enabled via volume mount)
API: http://localhost:5000

> Note: `.env.local` is mounted into the frontend container automatically.

## Running Tests

```bash
# Backend unit + integration tests
cd backend && dotnet test

# Frontend unit tests
cd frontend && npm test

# E2E (requires frontend running on :5173 and API on :5000)
cd e2e && npx playwright test
```

## Seeding Demo Data

After logging in at least once (so your teacher record exists), run the seeder to populate the dev database with 5 students and 5 lessons:

```bash
# By email
dotnet run --project backend/LangTeach.Api -- --seed you@example.com

# By Auth0 user ID
dotnet run --project backend/LangTeach.Api -- --seed "auth0|<user-id>"
```

The seeder is idempotent — running it again on the same account is a no-op.
The API does not need to be running when you execute this command.

## Logs

- **Backend**: console + `backend/LangTeach.Api/logs/api-YYYY-MM-DD.log` (rolling daily, via Serilog)
- **Frontend**: browser DevTools console — tagged `[TIMESTAMP] [LEVEL] [Context] message`

## Project Structure

```
langTeachSaaS/
├── frontend/                    # React + Vite
│   └── src/
│       ├── api/                 # Axios API clients (profileApi, ...)
│       ├── components/          # Layout, ProtectedRoute
│       ├── hooks/               # TanStack Query hooks (useProfile, ...)
│       ├── lib/                 # apiClient (Axios + auth interceptor), logger
│       ├── pages/               # Dashboard, Settings, ...
│       └── types/               # Shared TypeScript types
├── backend/
│   ├── LangTeach.Api/           # .NET 9 Web API
│   │   ├── Controllers/         # AuthController, HealthController, ProfileController
│   │   ├── Data/
│   │   │   ├── Models/          # EF Core entities (Teacher, TeacherSettings, ...)
│   │   │   ├── AppDbContext.cs
│   │   │   ├── SeedData.cs      # lesson template reference data (runs on startup)
│   │   │   └── DemoSeeder.cs    # dev demo data (run manually via --seed flag)
│   │   ├── DTOs/                # ProfileDto, UpdateProfileRequest
│   │   ├── Migrations/          # EF Core migrations
│   │   ├── Services/            # IProfileService, ProfileService
│   │   └── logs/                # Serilog rolling log files (git-ignored)
│   └── LangTeach.Api.Tests/     # xUnit integration tests
├── e2e/                         # Playwright end-to-end tests
│   ├── helpers/                 # auth-helper.ts
│   └── tests/                   # teacher-profile.spec.ts, ...
├── infra/                       # Azure Bicep IaC
│   ├── main.bicep
│   ├── parameters/              # dev.bicepparam, prod.bicepparam
│   └── modules/                 # sql, appservice, staticwebapp, storage, keyvault
├── plan/                        # Task plans
│   └── langteach-phase1/
├── .env.example                 # Copy to .env — docker-compose secrets
└── docker-compose.yml           # SQL Server + API + frontend (frontend optional — see above)
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
| T2 | Azure infrastructure (Bicep: Container Apps, SQL, SWA, Key Vault) | Done |
| T3 | Auth0 integration (JWT, Auth0Provider, Serilog, Playwright e2e) | Done |
| T4 | Database schema (EF Core migrations, Phase 1 tables, seed data) | Done |
| T5 | Teacher profile API + UI | Done — PR #11 |
| T6 | Student profiles API + UI | Pending |
| T7 | Lesson CRUD API | Pending |
| T8 | Lesson UI (planner, editor) | Pending |
| T9 | CI/CD pipeline (GitHub Actions) | Pending |
