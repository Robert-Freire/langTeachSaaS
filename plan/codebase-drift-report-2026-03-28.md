# Codebase Drift Report

**Date:** 2026-03-28
**Branch reviewed:** `sprint/student-aware-curriculum`
**Reviewed by:** Sophy (architect, data model drift) + Arch (architecture reviewer, pattern consistency)
**Purpose:** Full codebase health check. Provide to PM for issue creation and sprint planning.

---

## Executive Summary

The backend data model and DTOs are well-designed and align cleanly between frontend and backend. The critical drift is concentrated in three areas: (1) the frontend maintains a parallel copy of backend section profile rules that is already out of sync, (2) shared constants are duplicated across 8+ files instead of imported from canonical sources, and (3) the exercise rendering layer can only display 3 of the 40+ exercise types defined in the pedagogy model. Additionally, the Courses controller bypasses the established service layer pattern used everywhere else.

None of these require an architectural rewrite. All are incremental fixes.

---

## Finding 1: Frontend Section Profile Rules Are a Parallel Copy (Already Diverged)

**Severity:** CRITICAL
**Area:** Frontend, Backend API
**Type:** Config-in-code drift

### What's happening

`frontend/src/utils/sectionContentTypes.ts` hardcodes which `ContentBlockType` values are valid per section and CEFR level (lines 10-31). The backend reads the same rules from `data/section-profiles/*.json` via `SectionProfileService.GetAllowedContentTypes()`. The frontend cannot query these profiles because **no API endpoint exposes them**.

### Already diverged

| Section | Frontend says | Section profile says | Status |
|---------|--------------|---------------------|--------|
| Presentation | Allows `free-text` | Does not include `free-text` | OUT OF SYNC |
| Production | Hardcodes "B2+ gets reading" | Matches today, but read from code not config | FRAGILE |

### Root cause

No `/api/section-profiles` endpoint exists. The backend has `ISectionProfileService` with `GetAllowedContentTypes()` and `IsAllowed()`, but these are internal services only. The frontend was forced to maintain its own copy.

### Suggested fix

1. Expose a read-only API endpoint (e.g., `GET /api/section-profiles`) that returns allowed content types per section per level
2. Replace the hardcoded switch statement in `sectionContentTypes.ts` with an API call (cache on the client, these change rarely)
3. Delete the hardcoded copy

### Key files

- `frontend/src/utils/sectionContentTypes.ts` (the parallel copy)
- `backend/LangTeach.Api/Services/SectionProfileService.cs` (the source of truth)
- `data/section-profiles/*.json` (the config files)

---

## Finding 2: Constants Duplicated Across 8+ Files

**Severity:** CRITICAL
**Area:** Frontend
**Type:** Maintenance risk

### What's happening

Two key constants are copy-pasted across the codebase instead of imported from a single source:

**LANGUAGES** (8 copies + 1 variant):
- `Lessons.tsx:28`
- `LessonNew.tsx:19`
- `LessonEditor.tsx:54`
- `CourseNew.tsx:23`
- `Settings.tsx:13`
- `StudentForm.tsx:40`
- `OnboardingStep1.tsx:10`
- `OnboardingStep2.tsx:15`
- `OnboardingStep2.tsx:17` (variant: `NATIVE_LANGUAGES` adds "Catalan")

**CEFR_LEVELS** (6 copies, canonical source ignored):
- `Lessons.tsx:29`
- `LessonNew.tsx:20`
- `Settings.tsx:14`
- `StudentForm.tsx:41`
- `OnboardingStep1.tsx:11`
- `OnboardingStep2.tsx:16`
- Canonical export exists at `lib/cefr-colors.ts:1` but only `LessonEditor.tsx` and `CefrMismatchWarning.tsx` import it

### Impact

Adding a language or CEFR level requires touching 8-12 files. Easy to miss one and create inconsistency.

### Suggested fix

1. Create `lib/languages.ts` with a single `LANGUAGES` constant (and `NATIVE_LANGUAGES` if the Catalan variant is intentional)
2. Update all 6 files importing their own `CEFR_LEVELS` to import from `lib/cefr-colors.ts`
3. Delete all inline copies

This is a low-risk, high-value cleanup. Pure refactoring, no behavior change.

### Key files

- `frontend/src/lib/cefr-colors.ts` (canonical CEFR source, already exists)
- All 8 files listed above (consumers to update)

---

## Finding 3: Exercise Renderer vs Pedagogy Model Gap

**Severity:** CRITICAL (structural, but longer-term)
**Area:** Frontend, AI/Pedagogy
**Type:** Under-engineering

### What's happening

The exercise type catalog (`data/pedagogy/exercise-types.json`) defines **40+ exercise types** across 8 categories (CE, EE, EO, GR, VOC, PRAG, LUD, CO), each with a `uiRenderer` field mapping to a rendering strategy. The frontend's `ExercisesRenderer` can only display **3 formats**: `fillInBlank`, `multipleChoice`, `matching`.

The pedagogy model envisions rich exercise variety, but the rendering layer is structurally unable to display most of it. This is the "exercise drift" the user originally noticed: the AI generates diverse exercise types, but they all get squeezed into the same three UI shapes.

### Note

This is already partially tracked (#319 exercise type catalog). The PM should assess whether this needs further decomposition or is adequately covered.

### Key files

- `data/pedagogy/exercise-types.json` (40+ types defined)
- `frontend/src/components/lesson/renderers/ExercisesRenderer.tsx` (3 formats implemented)

---

## Finding 4: CoursesController Bypasses Service Layer

**Severity:** IMPORTANT
**Area:** Backend
**Type:** Pattern violation

### What's happening

`CoursesController` performs all CRUD directly on `AppDbContext` (List, Create, Update, Delete, curriculum operations). Every other controller (`LessonsController`, `StudentsController`) delegates to a service (`ILessonService`, `IStudentService`). No `ICourseService` exists.

Additionally, `LessonsController` itself bypasses its own service in two endpoints:
- `GetStudy` (line 193): queries `AppDbContext` directly
- `ExportPdf` (line 263): queries `AppDbContext` directly

### Impact

- Business logic lives in the controller instead of being testable/reusable via a service
- Inconsistent pattern makes the codebase harder to navigate
- JSON deserialization helpers (`TryDeserializeStringArray`, `TryDeserializeDifficultyArray`) in CoursesController duplicate logic already in `StudentService.cs`

### Suggested fix

1. Extract `ICourseService` / `CourseService` following the same pattern as `StudentService`
2. Move the two `LessonsController` endpoints to use `ILessonService`
3. Consolidate the JSON deserialization helpers into a shared utility

### Key files

- `backend/LangTeach.Api/Controllers/CoursesController.cs`
- `backend/LangTeach.Api/Controllers/LessonsController.cs` (lines 193, 263)
- `backend/LangTeach.Api/Services/StudentService.cs` (has the pattern to follow)

---

## Finding 5: ProfileController Auth Guard Missing

**Severity:** IMPORTANT
**Area:** Backend, Security
**Type:** Convention break

### What's happening

`ProfileController.cs:25` declares `Auth0Id` as `string` (non-nullable, null-forgiving `!`), while **all other controllers** declare it as `string?` and guard with `if (Auth0Id is null) return Unauthorized()`.

ProfileController skips this guard entirely.

### Impact

Latent auth-bypass risk. If the auth middleware ever fails to set the claim, other controllers return 401, but ProfileController would throw a NullReferenceException (500) instead of a clean 401.

### Suggested fix

Align with the pattern used by all other controllers: `string?` + null guard.

### Key files

- `backend/LangTeach.Api/Controllers/ProfileController.cs:25`

---

## Finding 6: Prompt Templates Ignore Config Values

**Severity:** IMPORTANT
**Area:** AI/Backend
**Type:** Config-in-code drift

### What's happening

`PromptService.cs:284` hardcodes section timing in prose (e.g., "warmUp: 2-5 min", "production: MANDATORY"). The section profiles already store `duration.min` / `duration.max` per section per level. The prompt template does not read these values; it uses its own hardcoded numbers.

If section timing is updated in the profiles, the prompt will continue using stale values.

### Suggested fix

Have the prompt builder read duration values from section profiles instead of hardcoding them. This could be done when Finding 1 is addressed (since it also involves making section profiles more accessible).

### Key files

- `backend/LangTeach.Api/AI/PromptService.cs:284`
- `data/section-profiles/*.json` (duration fields)

---

## Minor Findings

These are low-priority but worth tracking:

| # | Finding | Files | Type |
|---|---------|-------|------|
| M1 | 3 different function declaration styles across frontend API modules (arrow, async function, .then() chains) | `profileApi.ts`, `generate.ts`, `students.ts` | Convention |
| M2 | Date formatting inline in 4+ components with different format options, no shared `formatDate` utility | Various components | Duplication |
| M3 | Section type naming: backend stores `"WarmUp"`, profiles use `"warmup"`, frontend uses PascalCase union. Normalized via `.ToLowerInvariant()` but three conventions coexist | `SectionProfileService.cs`, section profiles, frontend types | Naming |
| M4 | `ReadingQuestion.type` is unvalidated `string`, should be enum (`"factual" / "inferential" / "vocabulary"` per PromptService) | `frontend/src/types/contentTypes.ts:82` | Type safety |
| M5 | `GenerateController.cs` lines 361-387 and 417-449: lesson plan section count validation runs twice with slightly different logic | `GenerateController.cs` | Duplication |

---

## Suggested Issue Grouping for PM

The findings cluster naturally into these potential issues:

| Group | Findings | Effort | Dependencies |
|-------|----------|--------|-------------|
| **Expose section profiles API** | F1, F6 | Medium | None |
| **Centralize frontend constants** | F2 | Small | None |
| **Backend service layer consistency** | F4, F5 | Medium | None |
| **Exercise renderer expansion** | F3 | Large | Partially tracked in #319 |
| **Minor cleanup batch** | M1-M5 | Small | None |

The first three groups are independent and can be parallelized. The exercise renderer is a longer-term effort already on the radar. The minor cleanup could be batched into a single `type:tech-debt` issue.
