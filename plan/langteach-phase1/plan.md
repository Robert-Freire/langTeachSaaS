# LangTeach Phase 1 — Foundation Plan

> **Goal**: Deployable skeleton with auth, teacher profile, student profiles, and full lesson CRUD (no AI).
> **Timeline**: Weeks 1-3
> **Outcome**: A teacher can register, set up their profile, add students, and create/edit/delete structured lessons from templates.

---

## Engineering Principles

- **Infrastructure as Code (non-negotiable):** Every Azure resource is declared in Bicep under `/infra` and committed to the repo. Nothing is created via the Portal or ad-hoc CLI commands. Imperative CLI scripts are not IaC — they are not idempotent, not reviewable, and cannot reproduce the environment reliably. The test: could a new developer re-create the full environment in a different tenant by running one command? If not, it is not IaC.
- **Secrets never in files or settings:** All secrets live in Key Vault. App Service reads them via Key Vault references. The source of truth for secret *values* is 1Password; the source of truth for secret *structure* is the Bicep files.
- **Row-level security on every data endpoint:** All API queries filter by `TeacherId` derived from the JWT. No endpoint may return data belonging to a different teacher.

---

## Deliverables Checklist

- [ ] Monorepo or dual-repo structure initialised and running locally
- [x] Azure infrastructure provisioned (SQL, Container Apps, Static Web Apps, Key Vault, Storage)
- [ ] Auth0 configured with email/password and Google OAuth
- [ ] Teacher can register, log in, and log out
- [ ] Teacher profile create/edit (languages taught, CEFR levels, preferred style)
- [ ] Student profiles CRUD (name, level, interests, notes)
- [ ] Lesson CRUD with structured sections and template selection
- [ ] Lesson list with search and filter
- [ ] CI/CD pipeline: push to main deploys to Azure

---

## Task Breakdown

### T1 — Repository & Tooling Setup (COMPLETED 2026-03-12)

**Priority**: Must | **Effort**: 0.5 days

- Monorepo with `/frontend` (React 19, Vite 8, TypeScript) and `/backend` (.NET 9 Web API)
- Frontend deps: React Router, Axios, Auth0 React SDK, TanStack Query
- Backend: EF Core 9, EF SqlServer, JwtBearer. Solution file uses `.slnx` format.
- `.editorconfig`, ESLint/Prettier (frontend), root `.gitignore`
- `docker-compose.yml` with all 3 services: SQL Server (port 1434), API (port 5000), Frontend (port 5173)
- Dockerfiles for frontend (multi-stage: dev with HMR, prod with nginx) and backend (SDK build, aspnet runtime)
- `README.md` with quick start instructions

**Deviations**: .NET 9 (not 8, SDK unavailable). SQL Server mapped to port 1434 (1433 in use). Full Docker stack, not SQL-only.

**Maintenance note**: Update `README.md` when ports, services, prerequisites, or startup commands change.

---

### T2 — Azure Infrastructure Provisioning (COMPLETED 2026-03-13)

**Priority**: Must | **Effort**: 0.5 days

> **IaC mandate**: All resources must be declared in Bicep files under `/infra` and committed to the repo. No resource is created via the Portal or ad-hoc CLI commands. This ensures the entire environment can be reproduced in a new tenant with a single `az deployment group create` command.

**Resources declared in Bicep** (`/infra/main.bicep` + modules):

| Resource | Tier | Notes |
|----------|------|-------|
| Azure SQL Server + Database | Basic (5 DTU) | Upgrade later; ~$5/mo |
| Azure App Service | B1 Linux | .NET 9 runtime |
| Azure Static Web Apps | Free tier | React frontend |
| Azure Blob Storage | LRS Standard | Phase 3 PDFs; create now, use later |
| Key Vault | Standard | Store connection strings and Auth0 secrets; RBAC model (not legacy access policies) |

**Repo structure added:**
```
infra/
├── main.bicep
├── parameters/
│   ├── dev.bicepparam
│   └── prod.bicepparam
└── modules/
    ├── sql.bicep
    ├── appservice.bicep
    ├── staticwebapp.bicep
    ├── storage.bicep
    └── keyvault.bicep
```

**Configuration:**
- App Service reads secrets via Key Vault references (`@Microsoft.KeyVault(...)`) — no secrets in app settings or code
- Key Vault uses RBAC (`Key Vault Secrets User` role) granted to App Service managed identity — declared in Bicep, not via `az keyvault set-policy`
- SQL firewall: Azure services allowed in Bicep; dev machine IP added once via CLI (IP not known at author time — only manual step)
- `appsettings.Production.json` added to backend — no secrets, only log levels and allowed hosts

**Deployment (idempotent, repeatable):**
```bash
az deployment group create \
  --resource-group rg-langteach-dev \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam \
  --parameters sqlAdminPassword="<from-1password>"
```

**Tenant migration:** `az login` to new tenant, `az group create`, re-run the command above. All infrastructure is recreated from the Bicep files. Only secrets (SQL password, Auth0 values) need to be re-supplied — store them in 1Password as the source of truth.

**Key deviations from original plan:**
- App Service replaced with **Azure Container Apps** (consumption plan) — VS Enterprise subscription has zero VM quota in all regions
- Region changed to **North Europe** — West Europe not accepting new SQL Server instances
- Static Web App stays in **West Europe** — SWA not available in North Europe
- Key Vault name uses `uniqueString()` suffix (`kv-lt-dev-5ba22u`) — global name collision with soft-deleted vault
- KV integration deferred to T4 — Container Apps validates KV references at deploy time before RBAC is granted; app will use `DefaultAzureCredential` + `AddAzureKeyVault` instead

**App URL:** `https://app-langteach-api-dev.purplewater-292509f3.northeurope.azurecontainerapps.io` (placeholder image until T9)

**Done when**: All resources provisioned via Bicep, Container App returns HTTP 200. ✓ Complete.

---

### T3 — Auth0 Setup & Integration

**Priority**: Must | **Effort**: 1 day

**Auth0 tenant config:**
- Create tenant (region: EU or US depending on target market)
- Application: Single Page Application (React frontend)
- Application: Machine-to-Machine or Regular Web App for API (to validate tokens)
- Enable Google social connection
- Set allowed callback URLs, logout URLs, and CORS origins (localhost + Azure domains)
- Custom domain: optional for V1, skip for now

**Backend (.NET):**
```
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.Authority = $"https://{auth0Domain}/";
        options.Audience = auth0Audience;
    });
```
- Add `[Authorize]` to all non-public endpoints
- On first authenticated request, upsert teacher record in DB using Auth0 `sub` claim as external ID

**Frontend (React):**
- Wrap app in `Auth0Provider`
- `useAuth0()` hook for login/logout state
- Axios interceptor: attach `Authorization: Bearer {token}` to every API request
- Redirect unauthenticated users to login; redirect post-login to `/dashboard`

**Done when**: Teacher can register with email/password and with Google, log in, and the API correctly identifies them from the JWT.

---

### T4 — Database Schema (Phase 1)

**Priority**: Must | **Effort**: 0.5 days

EF Core code-first migrations. All tables use `Guid` PKs, `CreatedAt`/`UpdatedAt` timestamps.

```sql
-- Teachers
Teachers (Id, Auth0UserId, Email, DisplayName, CreatedAt, UpdatedAt)

-- TeacherSettings
TeacherSettings (Id, TeacherId FK, TeachingLanguages JSON, CefrLevels JSON, PreferredStyle, CreatedAt, UpdatedAt)

-- Students
Students (Id, TeacherId FK, Name, LearningLanguage, CefrLevel, Interests JSON, Notes, CreatedAt, UpdatedAt)

-- LessonTemplates (seeded, read-only)
LessonTemplates (Id, Name, Description, DefaultSections JSON)

-- Lessons
Lessons (Id, TeacherId FK, StudentId FK nullable, TemplateId FK nullable,
         Title, Language, CefrLevel, Topic, DurationMinutes, Objectives,
         Status [Draft|Published], CreatedAt, UpdatedAt)

-- LessonSections
LessonSections (Id, LessonId FK, SectionType [WarmUp|Presentation|Practice|Production|WrapUp],
                OrderIndex, Notes, CreatedAt, UpdatedAt)
```

**Seed data** (LessonTemplates):
- Conversation lesson
- Grammar focus lesson
- Reading & comprehension lesson
- Writing skills lesson
- Exam prep lesson

Each template defines default section structure (which sections to include and suggested notes placeholder).

**Done when**: EF migrations run cleanly against local SQL and Azure SQL; seed data present.

---

### T5 — Teacher Profile API + UI

**Priority**: Must | **Effort**: 1 day

**API endpoints:**
```
GET    /api/profile          # Get current teacher's profile + settings
PUT    /api/profile          # Update profile
```

Request/response DTOs — no direct entity exposure.

**React UI — `/settings` route:**
- Display name field
- Teaching languages: multi-select from a fixed list (English, Spanish, French, German, Italian, Portuguese, Mandarin, Japanese, Arabic, Other)
- CEFR levels taught: checkboxes (A1, A2, B1, B2, C1, C2)
- Preferred content style: radio (Formal / Conversational / Exam-prep)
- Save button with optimistic UI update

**Done when**: Teacher can fill in and save profile; data persists across sessions.

---

### T6 — Student Profiles API + UI

**Priority**: Must | **Effort**: 1.5 days

**API endpoints:**
```
GET    /api/students              # List (paginated, filter by language/level)
POST   /api/students              # Create
GET    /api/students/{id}         # Get single
PUT    /api/students/{id}         # Update
DELETE /api/students/{id}         # Delete (soft delete)
```

Row-level security: all queries filter by `TeacherId` from JWT claim. A teacher cannot read another teacher's students.

**React UI:**
- `/students` — list view: name, language, level, interests chips, edit/delete actions
- `/students/new` and `/students/{id}/edit` — form: name, language (dropdown), CEFR level (dropdown), interests (free-text tags input), notes (textarea)
- Delete: confirmation dialog before API call
- Empty state with "Add your first student" CTA

**Done when**: Full CRUD working; teacher cannot access other teachers' data (verified by manual test with two accounts).

---

### T7 — Lesson CRUD API

**Priority**: Must | **Effort**: 1.5 days

**API endpoints:**
```
GET    /api/lessons                    # List with search + filter
POST   /api/lessons                    # Create (with sections)
GET    /api/lessons/{id}               # Get (includes sections)
PUT    /api/lessons/{id}               # Update lesson metadata
PUT    /api/lessons/{id}/sections      # Update all sections (replace)
DELETE /api/lessons/{id}               # Soft delete
POST   /api/lessons/{id}/duplicate     # Duplicate lesson + sections
```

**Lesson list filters** (query params): `language`, `cefrLevel`, `status`, `search` (title/topic text match).

**Create lesson flow:**
1. POST to `/api/lessons` with metadata + optional `templateId` + optional `studentId`
2. If `templateId` provided: server copies template's default sections as starting sections
3. Return full lesson with sections

**Sections update:** PUT replaces all sections atomically (simpler than per-section endpoints in Phase 1).

**Duplicate:** copies lesson metadata (resetting status to Draft) and all sections.

**Done when**: All endpoints return correct data; row-level security enforced; pagination working on list.

---

### T8 — Lesson UI (Planner)

**Priority**: Must | **Effort**: 2 days

**Routes:**
- `/lessons` — list view
- `/lessons/new` — creation wizard (step 1: pick template or blank; step 2: fill metadata)
- `/lessons/{id}` — lesson editor

**List view (`/lessons`):**
- Card or table layout: title, language, level, topic, status badge, last updated
- Search input (debounced, hits API)
- Filter dropdowns: language, CEFR level, status
- "New Lesson" button
- Empty state

**Creation wizard:**
- Step 1: template picker — 5 template cards (Conversation, Grammar, Reading, Writing, Exam Prep) + "Blank"
- Step 2: form — title, language, CEFR level, topic, duration (slider: 30/45/60/90 min), objectives (textarea), optional student profile link (searchable dropdown)

**Lesson editor (`/lessons/{id}`):**
- Top bar: title (editable inline), status toggle (Draft / Published), Save button, Duplicate, Delete
- Metadata strip: language, level, topic, duration, objectives (collapsible)
- Section panels (5 sections in fixed order): each has a section type header and a free-text notes textarea
- Sections save on blur (auto-save), with a "saved" indicator
- "Link Student" button if no student is currently linked

**Done when**: Teacher can create a lesson from a template, edit all sections, switch status, duplicate, and delete. All changes persist.

---

### T9 — CI/CD Pipeline

**Priority**: Must | **Effort**: 0.5 days

Two GitHub Actions workflows:

**`frontend.yml`** — triggers on push to `main` (changes in `/frontend`):
- `npm ci && npm run build`
- Deploy to Azure Static Web Apps via official action

**`backend.yml`** — triggers on push to `main` (changes in `/backend`):
- `dotnet restore && dotnet build && dotnet test`
- `dotnet publish -c Release`
- Deploy to Azure App Service via publish profile secret

**Environment secrets** stored in GitHub repo secrets:
- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `AZURE_WEBAPP_PUBLISH_PROFILE`
- `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` (injected as App Service env vars)

**Done when**: Merging to main auto-deploys both frontend and backend with no manual steps.

---

## Dependency Order

```
T1 (repo setup)
  └── T4 (schema)
        ├── T5 (profile API)  ──> T5 UI
        ├── T6 (students API) ──> T6 UI
        └── T7 (lessons API)  ──> T8 UI
T2 (Azure infra)
T3 (Auth0)  ──────────────────────> T5, T6, T7, T8 all depend on auth working
T9 (CI/CD)  ──> after T1 + T2 + T3
```

T1, T2, and T3 can be worked in parallel. T4 depends only on T1. Everything else depends on T3 and T4.

---

## Definition of Done — Phase 1

A QA pass with two separate Auth0 test accounts confirms:

1. Register with email/password and with Google OAuth
2. Complete teacher profile; re-open settings and confirm data persisted
3. Create 3 student profiles with different levels and interests; edit one; delete one
4. Create a lesson from the "Grammar focus" template; fill in all sections; save as draft
5. Create a second lesson from blank; link it to a student; publish it
6. Lesson list shows both lessons; search by title finds the correct one; filter by level works
7. Duplicate a lesson; confirm it appears as a new draft
8. Account B cannot see Account A's lessons or students (manual test)
9. Push a trivial change to main; confirm Azure deploys automatically within 5 minutes

---

## Open Questions for Phase 1

- [ ] Monorepo (one GitHub repo, two folders) vs. separate repos? Recommend: monorepo for simplicity in solo/small team.
- [ ] Local dev: docker-compose SQL Server vs. LocalDB vs. SQLite? Recommend: docker-compose SQL Server to match production engine exactly.
- [ ] Auth0 free tier (7,500 MAU) is sufficient for beta. Confirm before launch whether paid tier is needed.
- [ ] Section auto-save on blur vs. explicit Save button? Recommend: auto-save with visible "Saved" indicator (like Notion) for better UX.

---

*Created: March 2026*
