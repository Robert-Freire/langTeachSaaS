# T4 — Database Schema (Phase 1)

**Branch:** `task/t4-database-schema`
**Effort:** 0.5 days
**Depends on:** T1 (done), T3 (done)

---

## Goal

Define all Phase 1 EF Core entities, generate the initial migration, apply it to local SQL and Azure SQL, and seed the 5 lesson templates. Deliver `auth-helper.ts` for all future Playwright tests.

---

## Entities

All entities use `Guid` PKs. All mutable entities have `CreatedAt` and `UpdatedAt` (`DateTime`, UTC).

### Teacher
```csharp
Id          Guid        PK
Auth0UserId string      unique, not null   -- from JWT "sub" claim
Email       string      not null
DisplayName string      not null
CreatedAt   DateTime
UpdatedAt   DateTime
```
- Unique index on `Auth0UserId`
- T4 provides the entity and migration only. The Teacher upsert in `AuthController.Me()` is wired in T5 (Teacher Profile API).

### TeacherSettings
```csharp
Id                  Guid        PK
TeacherId           Guid        FK → Teachers, cascade delete
TeachingLanguages   string      JSON column (string[])
CefrLevels          string      JSON column (string[])
PreferredStyle      string      (Formal | Conversational | ExamPrep)
CreatedAt           DateTime
UpdatedAt           DateTime
```
- One-to-one with Teacher; created on first profile save (T5)

### Student
```csharp
Id                Guid        PK
TeacherId         Guid        FK → Teachers, cascade delete
Name              string      not null
LearningLanguage  string      not null
CefrLevel         string      not null    (A1|A2|B1|B2|C1|C2)
Interests         string      JSON column (string[])
Notes             string      nullable
IsDeleted         bool        default false   -- soft delete
CreatedAt         DateTime
UpdatedAt         DateTime
```
- Index on `(TeacherId, IsDeleted)` for list queries

### LessonTemplate
```csharp
Id               Guid        PK
Name             string      not null
Description      string      not null
DefaultSections  string      JSON column (TemplateSectionDto[])
```
- Seeded, read-only — no `CreatedAt`/`UpdatedAt` needed
- `TemplateSectionDto`: `{ SectionType: string, OrderIndex: int, NotesPlaceholder: string }`

### Lesson
```csharp
Id              Guid        PK
TeacherId       Guid        FK → Teachers, cascade delete
StudentId       Guid?       FK → Students, set null on delete
TemplateId      Guid?       FK → LessonTemplates, set null on delete
Title           string      not null
Language        string      not null
CefrLevel       string      not null
Topic           string      not null
DurationMinutes int
Objectives      string      nullable
Status          string      (Draft | Published)
IsDeleted       bool        default false
CreatedAt       DateTime
UpdatedAt       DateTime
```
- Index on `(TeacherId, IsDeleted)` for list queries

### LessonSection
```csharp
Id          Guid        PK
LessonId    Guid        FK → Lessons, cascade delete
SectionType string      (WarmUp | Presentation | Practice | Production | WrapUp)
OrderIndex  int
Notes       string      nullable
CreatedAt   DateTime
UpdatedAt   DateTime
```
- Index on `LessonId` for section fetches

---

## AppDbContext Changes

Add `DbSet` for each entity and configure via `OnModelCreating`:
- Unique index on `Teacher.Auth0UserId`
- Composite indexes noted above
- JSON column mapping for `TeachingLanguages`, `CefrLevels`, `Interests`, `DefaultSections` using EF Core 8+ JSON columns (`OwnsOne` / `ToJson` or store as `string` + manual serialization — use `string` for simplicity in Phase 1 since Azure SQL does not support `jsonb` natively and EF JSON columns require owned types)
- All `string` JSON fields stored as `nvarchar(max)`, serialized/deserialized in service layer

---

## Migration

```bash
cd backend
dotnet ef migrations add InitialSchema --project LangTeach.Api
dotnet ef database update --project LangTeach.Api
```

Connection string for local dev: `appsettings.Development.json` → `ConnectionStrings:Default` → `localhost,1434`.

Azure SQL: run `dotnet ef database update` once with the Azure connection string (from 1Password) after merge.

---

## Seed Data

Applied in `Program.cs` on startup (after `app.Build()`, before `app.Run()`):
- Check if any `LessonTemplates` rows exist; if yes, skip
- Insert the 5 templates below
- Log `"Seeding lesson templates"` at `Information`, or `"Lesson templates already seeded, skipping"` if skipping

| Name | Sections (in order) |
|------|---------------------|
| Conversation | WarmUp, Practice, Production, WrapUp |
| Grammar Focus | WarmUp, Presentation, Practice, Production, WrapUp |
| Reading & Comprehension | WarmUp, Presentation, Practice, WrapUp |
| Writing Skills | WarmUp, Presentation, Practice, Production, WrapUp |
| Exam Prep | WarmUp, Presentation, Practice, Production, WrapUp |

Each section carries a `NotesPlaceholder` string (e.g. `"Introduce topic with a question or short video"` for WarmUp in Conversation).

---

## Startup Migration Application

In `Program.cs`, after `var app = builder.Build()`:
```csharp
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    logger.LogInformation("Applying pending EF migrations...");
    await db.Database.MigrateAsync();
    logger.LogInformation("Migrations applied successfully.");
    await SeedData.SeedAsync(db, logger);
}
```

This replaces a manual `dotnet ef database update` in production/Container Apps — migrations run automatically on startup.

---

## Playwright: `auth-helper.ts`

Location: `e2e/helpers/auth-helper.ts`

Purpose: return an authenticated Playwright `BrowserContext` with a valid Auth0 session cookie/token, usable by all T5+ tests.

Implementation approach — **username/password login via UI** (most reliable for Auth0 SPA flow):
```typescript
export async function createAuthenticatedContext(browser: Browser): Promise<BrowserContext> {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:5173');
    // Auth0 redirects to Universal Login
    await page.fill('[name="username"]', process.env.E2E_TEST_EMAIL!);
    await page.fill('[name="password"]', process.env.E2E_TEST_PASSWORD!);
    await page.click('[name="action"]');
    await page.waitForURL('**/dashboard');
    await page.close();
    return context;  // context retains the Auth0 session cookie
}
```

Environment variables (add to `e2e/.env`):
```
E2E_TEST_EMAIL=<test user email from 1Password>
E2E_TEST_PASSWORD=<test user password from 1Password>
```

**No T4-specific Playwright feature test needed** — `auth-helper.ts` itself is the T4 Playwright deliverable.

---

## File Changes Summary

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Data/AppDbContext.cs` | Add all DbSets + `OnModelCreating` config |
| `backend/LangTeach.Api/Data/Models/Teacher.cs` | New entity |
| `backend/LangTeach.Api/Data/Models/TeacherSettings.cs` | New entity |
| `backend/LangTeach.Api/Data/Models/Student.cs` | New entity |
| `backend/LangTeach.Api/Data/Models/LessonTemplate.cs` | New entity |
| `backend/LangTeach.Api/Data/Models/Lesson.cs` | New entity |
| `backend/LangTeach.Api/Data/Models/LessonSection.cs` | New entity |
| `backend/LangTeach.Api/Data/SeedData.cs` | New static seed class |
| `backend/LangTeach.Api/Program.cs` | Add migration + seed call on startup |
| `backend/LangTeach.Api/Migrations/` | Generated by EF CLI |
| `e2e/helpers/auth-helper.ts` | New Playwright auth helper |
| `e2e/.env` (gitignored) | E2E test credentials |
| `e2e/.env.example` | Placeholder committed to repo |

---

## Pre-push Checks

- `dotnet build` — zero warnings/errors
- `dotnet test` — all tests pass (existing HealthController test must still pass)
- `npm run build` (frontend) — no changes expected, still must pass
- `cd e2e && npx playwright test` — existing `auth-diagnostic.spec.ts` still passes

---

## Done When

- EF migration runs cleanly against local SQL Server (docker-compose, port 1434)
- All 5 lesson templates present in DB after first startup
- Startup logs show migration and seed messages
- `e2e/helpers/auth-helper.ts` exists and is importable
- All pre-push checks pass
