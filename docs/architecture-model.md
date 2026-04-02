# LangTeach SaaS Architecture Model

**Guardian:** Sophy (architecture-reviewer agent, /sophy skill)
**Last updated:** 2026-03-28
**Status:** Living document. Every PR that changes a boundary, flow, or invariant should update this file.

---

## 1. System Overview

LangTeach is a SaaS for language teachers. A teacher creates students, plans courses with AI-generated curricula, and generates lesson content (vocabulary, grammar, exercises, etc.) via Claude. The system enforces pedagogical rules from Isaac's specification through a layered JSON configuration architecture.

**Stack:** .NET 9 API (single project) + React 18 SPA + SQL Server + Azure Container Apps

---

## 2. External Boundaries

| System | Role | Auth | Notes |
|--------|------|------|-------|
| Auth0 | Identity provider | JWT Bearer | One tenant, teacher = Auth0 user |
| Claude API (Anthropic) | Content generation | API key (Key Vault) | Haiku for small blocks, Sonnet for lessons/curricula |
| Azure Blob Storage | Material files (PDFs, images) | Connection string (Key Vault) | Single container "materials", SAS URLs (15min) |
| Azure Key Vault | Secrets | Managed identity | 5 required secrets validated at startup |
| Azure Container Apps | Hosting | OIDC (ACR) | North Europe, CD from main branch |
| Azure Static Web Apps | Frontend hosting | N/A | West Europe |

**Rule:** The API is the only component that talks to external services. The frontend talks only to the API.

---

## 3. Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React SPA)                               │
│  Routes -> Pages -> Feature Components -> API hooks │
│  Auth0 token in every request                       │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS (axios + SSE for streaming)
┌──────────────────────▼──────────────────────────────┐
│  Controllers (14)                                   │
│  Auth filter on all endpoints                       │
│  Teacher identified by Auth0Id + email from JWT     │
│  All queries scoped to TeacherId (multi-tenancy)    │
├─────────────────────────────────────────────────────┤
│  Services (scoped)                                  │
│  LessonService, StudentService, CourseService, ...  │
│  ProfileService (upsert teacher on first request)   │
│  UsageLimitService (token tracking)                 │
├─────────────────────────────────────────────────────┤
│  AI Layer                                           │
│  PromptService: builds prompts from context + config│
│  ClaudeApiClient: HTTP streaming to Anthropic API   │
│  GenerateController: SSE stream to frontend         │
├─────────────────────────────────────────────────────┤
│  Pedagogy Config (singletons, loaded at startup)    │
│  PedagogyConfigService: 6-layer JSON composition    │
│  SectionProfileService: 5 section profile files     │
│  CurriculumTemplateService: lesson templates (DB)   │
│  SessionMappingService: session count mapping        │
├─────────────────────────────────────────────────────┤
│  Data Layer (EF Core 9 + SQL Server)                │
│  AppDbContext, migrations auto-run at startup       │
│  Soft deletes (IsDeleted), cascade rules per FK     │
└─────────────────────────────────────────────────────┘
```

### Layer rules

1. **Controllers** never contain business logic. They map HTTP to service calls and handle auth context extraction.
2. **Services** own business logic and data access. A service may call other services but not controllers.
3. **AI Layer** (PromptService + ClaudeApiClient) is the only code that builds prompts or calls Claude. No service or controller constructs prompt text directly.
4. **Pedagogy Config services** are singletons loaded once at startup. They are read-only after initialization. PromptService depends on them; they depend on nothing except embedded JSON resources.
5. **Data Layer** is accessed only through services, never from controllers directly.

---

## 4. Entity Model

```
Teacher (Auth0UserId, Email, DisplayName)
  ├── 1:1 TeacherSettings              [cascade delete]
  ├── 1:N Students                      [cascade delete]
  ├── 1:N Lessons                       [cascade delete]
  ├── 1:N Courses                       [cascade delete]
  └── 1:N GenerationUsages              [usage tracking]

Student (TeacherId FK, CefrLevel, NativeLanguage,
         Interests[], Weaknesses[], Difficulties[])
  ├── 0:N Lessons                       [NoAction FK]
  └── 0:N Courses                       [optional FK]

Course (TeacherId, StudentId?, TargetCefrLevel, Mode: general|exam-prep)
  └── 1:N CurriculumEntries (OrderIndex, Status: planned|created|taught)

Lesson (TeacherId, StudentId?, TemplateId?)
  ├── 1:N LessonSections                [cascade]
  │     └── 1:N Materials               [cascade]
  ├── 1:N LessonContentBlocks           [cascade]
  └── 0:1 LessonNote                    [cascade]

LessonContentBlock (BlockType, GeneratedContent, EditedContent, GenerationParams)
  BlockType enum: LessonPlan | Vocabulary | Grammar | Exercises |
                  Conversation | Reading | Homework | FreeText

LessonTemplate (seeded, read-only, FK set null on delete)
```

### Entity rules

- **Multi-tenancy:** Every query filters by TeacherId. No cross-teacher data access.
- **Soft deletes:** Teachers, Students, Lessons, Courses, CurriculumEntries use IsDeleted flag. Index on (TeacherId, IsDeleted).
- **Student-Lesson FK is NoAction:** Deleting a student does not cascade to lessons (SQL Server constraint). Application code handles orphaned lessons.
- **JSON columns:** Student arrays (Interests, Weaknesses, Difficulties), Lesson warnings, generation params. These are opaque to SQL; queried only in application code.

---

## 5. Config vs Code Boundary

This is the central architectural decision. Pedagogical behavior is data-driven through a 6-layer JSON configuration system. Code composes and applies the config; it does not encode pedagogical rules.

### What lives in JSON config

| Layer | File(s) | Purpose | Changes when... |
|-------|---------|---------|-----------------|
| Exercise catalog | `data/pedagogy/exercise-types.json` | 76 exercise types with IDs, CEFR ranges, categories, uiRenderer | Isaac adds/modifies exercise types |
| CEFR level rules | `data/pedagogy/cefr-levels/a1.json` ... `c2.json` | Grammar scope, appropriate/inappropriate exercise types, vocabulary guidance, scaffolding | Isaac refines level-specific pedagogy |
| Section profiles | `data/section-profiles/*.json` | Per-section, per-level: allowed content types, valid/forbidden exercise types, guidance, duration, interaction pattern | Isaac adjusts what belongs in each lesson section |
| L1 influence | `data/pedagogy/l1-influence.json` | Language family adjustments, false friends, positive transfer, additional exercise types | A new L1 is supported or Isaac refines transfer rules |
| Template overrides | `data/pedagogy/template-overrides.json` | Per-template section overrides, priority exercise types, level variations, restrictions | A template needs pedagogical customization |
| Course rules | `data/pedagogy/course-rules.json` | Variety rules, skill distribution, grammar progression (spiral model) | Isaac adjusts multi-lesson constraints |
| Style substitutions | `data/pedagogy/style-substitutions.json` | Competency-preserving exercise type replacements | Isaac defines new fallback paths |

### What lives in C# code

| Component | Responsibility | Changes when... |
|-----------|---------------|-----------------|
| PedagogyConfigService | 8-step composition algorithm (intersect, filter, expand, reorder) | The composition logic itself changes (rare) |
| SectionProfileService | Load section profiles, IsAllowed check, raw field access | New queryable fields are added to profiles |
| PromptService | Assemble prompt text from config + context | A new prompt section is needed or prompt structure changes |
| ClaudeApiClient | HTTP streaming to Anthropic API | API contract changes |
| Content type enum + renderers | 8 block types with frontend renderers | A new content type is introduced |

### What lives in the database

| Data | Table | Changes when... |
|------|-------|-----------------|
| Student profile (level, L1, interests, weaknesses) | Students | Teacher edits student |
| Lesson structure and content blocks | Lessons + LessonContentBlocks | AI generates or teacher edits |
| Curriculum entries (topic, grammar, competencies) | CurriculumEntries | AI generates or teacher edits |
| Lesson templates (seeded) | LessonTemplates | Migration adds/modifies templates |

### Boundary invariant

> If someone is editing C# or TypeScript to change which exercises are valid at A1, what grammar is in scope for B2, or what content types a WarmUp section allows, the architecture is wrong. That change belongs in a JSON config file.

---

## 6. Config Composition Algorithm (PedagogyConfigService)

The `GetValidExerciseTypes(section, level, templateId?, nativeLang?)` method is the heart of the pedagogical enforcement:

```
1. Load CEFR appropriate types for level
2. Load section valid types (or use CEFR types if section has none)
3. Intersect: CEFR ∩ section
4. Expand forbidden patterns (e.g., "GR-*" -> all GR-xx IDs)
5. Subtract forbidden from intersection
6. Template priority reorder (reorder only, never adds)
7. Add L1 additional exercise types (dedup)
8. Re-filter forbidden (L1 additions must not bypass section restrictions)
```

**Conflict resolution:** Section rules restrict CEFR (intersection). Forbidden is absolute (applied twice). Templates reorder but cannot override restrictions. L1 additions are subject to the same forbidden filter.

**Startup validation:** Cross-layer reference check. Every exercise ID referenced in CEFR rules, L1 influence, template overrides, and style substitutions must exist in the exercise catalog. Startup fails fast on dangling references.

---

## 7. Content Generation Pipeline

```
Teacher action (frontend)
  │
  ▼
GenerateController.StreamGeneration(taskType, request)
  │  Extract Auth0Id + email from JWT
  │  UpsertTeacher via ProfileService
  │  Load student context (if studentId provided)
  │  Build GenerationContext
  ▼
PromptService.BuildUserPrompt(taskType, context)
  │  Compose base instruction for block type
  │  Append section profile guidance (SectionProfileService)
  │  Append CEFR grammar scope + vocabulary guidance (PedagogyConfigService)
  │  Append L1 adjustments (if native language known)
  │  Append template override (if template provided)
  │  Append weakness targeting (if student weaknesses declared)
  │  Append section coherence rules (always)
  │  Append curriculum objectives (if generating from curriculum entry)
  ▼
ClaudeApiClient.StreamAsync(request)
  │  SSE stream to Anthropic API
  ▼
Response streamed back to frontend via SSE
  │
  ▼
Frontend: useGenerate hook -> usePartialJsonParse -> ContentBlock renderer
  │  Coercion functions normalize AI output schema
  │  Content registry maps blockType to renderer triplet (Editor/Preview/Student)
  ▼
Stored in LessonContentBlocks (generatedContent + optional editedContent)
```

### Curriculum generation flow

```
Teacher creates course (CourseNew page)
  │  Select student, level, template, session count
  ▼
CurriculumGenerationService
  │  Load template (CurriculumTemplateService)
  │  Map sessions (SessionMappingService: expand/compress/exact)
  │  Build skeleton CurriculumEntries
  │  If student provided: personalize via Claude (PromptService.BuildCurriculumPrompt)
  ▼
CurriculumValidationService
  │  Validate structure + format
  ▼
Store CurriculumEntries in Course
```

---

## 8. Frontend Architecture

```
React 18 + React Router v6 + React Query + shadcn/ui

Routes:
  /                     Dashboard (week view, lessons, drafts, courses)
  /lessons              Lesson list
  /lessons/new          Create lesson
  /lessons/:id          LessonEditor (sections, content blocks, generation)
  /lessons/:id/study    StudyView (read-only student-facing)
  /courses              Course list
  /courses/new          CourseNew (curriculum creation)
  /courses/:id          CourseDetail (curriculum walkthrough)
  /students             Student list
  /students/new|:id     StudentForm (create/edit)
  /onboarding           3-step onboarding wizard

All routes: ProtectedRoute (Auth0) + OnboardingGuard
```

### Frontend rules

1. **Server state via React Query.** No Redux/Zustand. Local component state for UI-only concerns.
2. **API layer is modular:** `src/api/` has one file per domain (lessons, students, courses, etc.). All use a shared axios client with auth interceptor.
3. **Content rendering uses a registry pattern:** `contentRegistry.tsx` maps each BlockType to a renderer triplet (Editor, Preview, Student views). Adding a new content type means: add the type, add the renderer, register it.
4. **Coercion functions normalize AI output:** Each renderer has a `coerce*Content` function that handles schema variations from Claude (field renames, wrapping, missing arrays). This is a pragmatic defense layer, not a design goal.
5. **SSE streaming for generation:** The generate endpoint uses fetch (not axios) with SSE. `usePartialJsonParse` incrementally parses the stream.

---

## 9. Invariants

These rules must always hold. A PR that violates an invariant is a bug, not a design choice.

| # | Invariant | Enforced by |
|---|-----------|-------------|
| 1 | Every query filters by TeacherId | Service layer + EF global query filter |
| 2 | Pedagogy config is immutable after startup | Singleton lifetime + no mutation methods |
| 3 | Exercise IDs referenced in any config layer must exist in the exercise catalog | PedagogyConfigService.ValidateCrossLayerRefs() at startup |
| 4 | Forbidden exercise types cannot appear in valid types, even via L1 additions | 8-step composition with double-filter |
| 5 | Template overrides reorder only; they never add types not already valid | Step 6 of composition (reorder within existing set) |
| 6 | Section content types are enforced at the CEFR level | SectionProfileService.IsAllowed(section, contentType, level) |
| 7 | All 5 required Key Vault secrets must be present at startup | StartupConfigValidator (fail-fast) |
| 8 | Content block types are a closed set (8 values) | C# enum + frontend ContentBlockType union + exercise catalog uiRenderer |
| 9 | Student-Lesson FK uses NoAction delete | EF migration configuration |
| 10 | Soft-deleted records are excluded from all queries | IsDeleted filter in service layer |

---

## 10. Adding New Things (Decision Guide)

### New exercise type
1. Add to `data/pedagogy/exercise-types.json` (ID, name, CEFR range, uiRenderer)
2. Add to relevant `data/pedagogy/cefr-levels/*.json` appropriate lists
3. If restricted from sections, add to section profile `forbiddenExerciseTypes`
4. No C# or TypeScript changes needed (unless it needs a new renderer)

### New content block type
1. **Create `data/content-schemas/<content-type-key>.json`** (JSON Schema draft-07) and add `EmbeddedResource` entry in `LangTeach.Api.csproj`. `ContentSchemaService` loads it automatically at startup; no other C# changes required for the schema itself.
2. Add to `ContentBlockType` enum (C#) + kebab map
3. Add TypeScript union member + content interface
4. Create renderer triplet (Editor/Preview/Student)
5. Register in `contentRegistry.tsx`
6. Add prompt builder in PromptService
7. Update section profiles with new content type where allowed
8. This is a code change because it involves new rendering logic

### New CEFR level rule
1. Edit `data/pedagogy/cefr-levels/<level>.json`
2. No code changes

### New L1 support
1. Add language family or specific language to `data/pedagogy/l1-influence.json`
2. No code changes (PedagogyConfigService.ResolveLang handles lookup)

### New lesson template
1. DB migration to seed the template row
2. Add entry to `data/pedagogy/template-overrides.json` if pedagogical customization needed
3. No other code changes

### New section type
1. Add section profile JSON file in `data/section-profiles/`
2. Update SectionProfileService to load it
3. Update SectionOrder in PromptService
4. Update frontend section rendering
5. This is a code + config change
