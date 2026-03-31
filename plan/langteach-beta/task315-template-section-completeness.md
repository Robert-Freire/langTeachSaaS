# Task 315: Enforce Template Section Completeness and Content-Type Correctness

## Problem

Two template bugs found by Teacher QA (2026-03-28):

1. **Conversation template** seeded without Presentation (WarmUp, Practice, Production, WrapUp only). The Presentation section is optional per config but should be seeded so teachers can use it for A1 students (PPP methodology).
2. **R&C template** seeded without Production (WarmUp, Presentation, Practice, WrapUp only). Production is `required: true` in config but was omitted from SeedData.

Root cause: `SeedData.cs` hardcodes which sections appear in each template instead of reading from `template-overrides.json`.

Additionally, `GenerateController.cs` hardcodes the number `5` when validating lesson plan section completeness, which is wrong for templates with different section counts.

## Current State

- `template-overrides.json` already declares all 5 standard sections per template with `required: true/false` and `overrideGuidance`.
- R&C Presentation already has `preferredContentType: "reading"` directing AI toward reading-text-first.
- `PedagogyConfigService` loads and exposes `TemplateOverrideEntry` via `GetTemplateOverrideByName()`.
- `SeedData.cs` hardcodes sections; guard skips re-seed if any templates exist.
- `GenerateController.cs` has two duplicate `< 5` hardcoded checks on the lesson plan response.

## Implementation Plan

### Step 1: Add `GetRequiredSectionNames` to `IPedagogyConfigService`

In `IPedagogyConfigService.cs`, add:
```csharp
/// <summary>
/// Returns section names (e.g. "warmUp", "production") that are required:true
/// for the template identified by display name. Returns null if template not found.
/// Canonical order: warmUp, presentation, practice, production, wrapUp.
/// </summary>
IReadOnlyList<string>? GetRequiredSectionNames(string templateName);
```

In `PedagogyConfigService.cs`, implement by filtering `tmpl.Sections` where `Required == true`, returning in canonical order.

This method is used ONLY for the GenerateController validation (Step 4). Seeding uses a different path (Step 2).

### Step 2: Update `SeedData.cs` to read from config

- Accept `IPedagogyConfigService` as a new parameter to `SeedAsync`.
- Change the guard from skip-if-any to upsert-by-name: look up each template by name, insert if missing, update `DefaultSections` if present.
- For each template, derive `DefaultSections` by calling `GetTemplateOverrideByName(name)` and iterating `.Sections` directly (NOT `GetRequiredSectionNames` - seeding needs ALL sections, not just required ones):
  - Canonical section order: warmUp=0, presentation=1, practice=2, production=3, wrapUp=4
  - Seed ALL sections declared in the config (both required and optional), so teachers have all sections available.
  - Use `OverrideGuidance` as `NotesPlaceholder`; fall back to section key name if null.
- Keep template `Name`, `Description` hardcoded in SeedData (DB-level concerns, not pedagogical rules).
- Scope: only update the 5 templates already in SeedData (Conversation, Grammar Focus, Reading & Comprehension, Writing Skills, Exam Prep). "Thematic Vocabulary" and "Culture & Society" exist in config but not in SeedData - this is a pre-existing gap, out of scope here.

### Step 3: Update `Program.cs`

Pass `IPedagogyConfigService` to `SeedData.SeedAsync()`:
```csharp
var pedagogy = app.Services.GetRequiredService<IPedagogyConfigService>();
await SeedData.SeedAsync(db, pedagogy, startupLogger);
```

### Step 4: Fix hardcoded `< 5` in `GenerateController.cs`

The `Generate` method has two different validation blocks (NOT identical):
- **First block (lines ~370-387, pre-save)**: counts populated sections (non-empty string values). This is the quality signal.
- **Second block (lines ~417-449, post-save)**: counts all section keys (property count). This duplicates the intent but checks a weaker condition.

**Decision**: Remove the second (post-save, weaker) block entirely. Keep the first (pre-save, populated-count) block and make it config-driven:

```csharp
var requiredSections = _pedagogyConfig.GetRequiredSectionNames(templateName ?? "");
var expectedCount = requiredSections?.Count ?? 5; // default 5 if no template
if (populatedSections < expectedCount)
    _logger.LogWarning(
        "LessonPlan generated with only {SectionCount}/{Expected} sections. LessonId={LessonId}",
        populatedSections, expectedCount, lesson.Id);
```

Also inject `IPedagogyConfigService _pedagogyConfig` into `GenerateController`. Since tests use `WebApplicationFactory` with the full DI container, no test setup changes are needed for this injection.

### Step 5: Update tests

- `PedagogyConfigServiceTests.cs`: add test for `GetRequiredSectionNames` on Conversation (returns 4) and R&C (returns 5).
- `GenerateControllerTests.cs`: if any test mocks the lesson plan response with a section count, update mock setup to pass `IPedagogyConfigService`.
- Add a seeding integration test is out of scope for this task (SeedData is tested via Teacher QA).

## Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|---------------|
| Template section requirements in JSON config | Already in `template-overrides.json` (Required field) |
| SeedData reads from config | Step 2: derive sections from `GetTemplateOverride` |
| R&C Presentation updated to reading-text-first | Already in config (`preferredContentType: "reading"`, updated guidance) |
| Validation logic generic (no hardcoded names/sections) | Step 1+4: config-driven section count check |
| No hardcoded level/language/template conditions in C# | Satisfied by Steps 1-4 |
| Teacher QA Ana A1 (Conversation) + Carmen B2 (R&C) | Run `/teacher-qa ana-a1` and `/teacher-qa carmen` after deploy |
| Update prior-findings.md | Done last, after PR merge |

## Files to Change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` | Add `GetRequiredSectionNames` |
| `backend/LangTeach.Api/Services/PedagogyConfigService.cs` | Implement `GetRequiredSectionNames` |
| `backend/LangTeach.Api/Data/SeedData.cs` | Read from config, upsert sections |
| `backend/LangTeach.Api/Program.cs` | Pass pedagogy service to SeedAsync |
| `backend/LangTeach.Api/Controllers/GenerateController.cs` | Inject pedagogy, config-driven section count |
| `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs` | Tests for GetRequiredSectionNames |

## Notes

- No DB migration needed. `DefaultSections` is a JSON column on `LessonTemplate`; the upsert approach updates it in-place.
- Existing lessons already created from old templates will NOT be retroactively updated. Only new lessons benefit from the fixed templates. This is acceptable for beta.
- The `required: false` flag on Conversation Presentation is correct (teachers can skip it for experienced students). Seeding it in the DB regardless gives teachers the option.
