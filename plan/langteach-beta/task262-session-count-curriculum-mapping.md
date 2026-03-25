# Task 262: Session-Count-to-Curriculum Mapping

**Issue**: #262
**Branch**: worktree-task-t262-session-count-curriculum-mapping
**Sprint**: student-aware-curriculum

## Problem

When a teacher uses a curriculum template (e.g. A1.1 with 4 units) they currently cannot choose a custom session count — the UI forces sessions = units. The issue demands that:

- Sessions > units → split units across multiple sessions (sub-focus per session)
- Sessions < units → cover only the first N units, show what's excluded
- Sessions = units → 1:1 mapping (existing behaviour, still works)

The teacher must see the mapping BEFORE confirming course creation.

## Current state

- Frontend: session count selector is hidden when `useTemplate` is true; `sessionCount` is forced to `selectedTemplateData.unitCount`
- Backend: `CurriculumGenerationService` creates one `CurriculumEntry` per template unit regardless of `SessionCount`

## Solution

### New service: `SessionMappingService`

Pure deterministic logic, no AI, no DB.

**Input**: `IReadOnlyList<CurriculumTemplateUnit> units`, `int sessionCount`
**Output**: `SessionMappingResult`

**Mapping strategies:**

_Exact (sessions == units)_: 1:1. Session i → Unit i. Topic = unit title.

_Expand (sessions > units)_: distribute sessions evenly.
- base = sessionCount / unitCount (integer division)
- extra = sessionCount % unitCount
- Unit i gets `base + (i < extra ? 1 : 0)` sessions (minimum 1)
- Sub-focus labels per session slot within a unit:
  - 1 session: unit title only
  - 2 sessions: "Foundation", "Extended Practice"
  - 3 sessions: "Introduction", "Practice", "Production"
  - 4+ sessions: "Introduction", "Practice 1", "Practice 2", ..., "Production"
- Rationale: "Unit N spans sessions X–Y to allow extended practice of [first 3 grammar topics]"

_Compress (sessions < units)_: take first N units (preserving grammar progression order).
- Sessions map 1:1 to the first `sessionCount` units
- ExcludedUnits contains the remaining unit titles
- Rationale at mapping level: "Course covers units 1–N. Not included: [unit titles]"

_Edge: sessionCount == 1_: selects unit 0 (the intro/highest-priority), scopes to one session.

### New DTOs

```csharp
public record SessionMappingEntry(
    int SessionIndex,
    string UnitRef,
    string SubFocus,
    string Rationale,
    string? GrammarFocus  // from the unit, for context
);

public record SessionMappingResult(
    string Strategy,         // "exact" | "expand" | "compress"
    int SessionCount,
    int UnitCount,
    List<SessionMappingEntry> Sessions,
    List<string> ExcludedUnits  // empty unless compress
);
```

### New API endpoint

`GET /api/curriculum-templates/{level}/mapping?sessionCount=N`

- Lives on `CurriculumTemplatesController` (new controller action)
- Returns `SessionMappingResult`
- Requires auth (Authorize attribute)
- Returns 404 if template not found
- Returns 400 if sessionCount < 1 or > 100

### Modified: `CurriculumGenerationService`

When `ctx.TemplateLevel` is set and `ctx.SessionCount != template.Units.Count`:
- Call `SessionMappingService.Compute(template.Units, ctx.SessionCount)`
- Build one `CurriculumEntry` per `SessionMappingEntry` instead of per unit:
  - `Topic` = `{UnitRef}: {SubFocus}` (or just UnitRef if exact/single-session)
  - `GrammarFocus` = from the mapped unit
  - `TemplateUnitRef` = unit title
  - `CompetencyFocus`, `Competencies` = from the unit
  - `OrderIndex` = `SessionMappingEntry.SessionIndex`

Pass `SessionCount` in `CurriculumContext` (already a field: `SessionCount`). Controller already sets this. The generation service needs to read it.

### Frontend changes

**1. Show session count when template selected**

The session count selector is at line 283 of `CourseNew.tsx`, wrapped in `{!useTemplate && (...)}`. Remove the `!useTemplate` condition so it always shows. Keep it at the same position in the form (after template picker, before student picker). The SESSION_COUNTS list remains unchanged.

Remove the forced `selectedTemplateData.unitCount` in `sessionCount` field of the mutation — always use `parseInt(sessionCount)`.

**2. Mapping preview query**

After template and session count are both selected, always fetch the mapping preview (including exact/1:1 case — the backend returns strategy: "exact" and the preview card shows a brief confirmation):

```tsx
const { data: mappingPreview } = useQuery({
  queryKey: ['mapping-preview', selectedTemplate, sessionCount],
  queryFn: () => getMappingPreview(selectedTemplate, parseInt(sessionCount)),
  enabled: useTemplate && !!selectedTemplate && !!sessionCount,
})
```

**3. Mapping preview card**

Replace/extend the existing "Sample grammar" card with a mapping preview:

- Header: strategy label ("Expanding 4 units across 12 sessions" / "Covering 4 of 8 units")
- Session list: `Session 1 — Nosotros: Introduction (El género, ser/llamarse/tener)`
- If compress: excluded units callout: "Not covered: [Unit 5], [Unit 6]..."
- Rationale text per unit group (not per session — too verbose)

Component: `SessionMappingPreview.tsx`

**4. Submit button label**

When mapping exists: "Create Course (N sessions)" — N = chosen sessionCount.

## Key flow verification

`CoursesController.Create` lines 124-126:
```csharp
resolvedSessionCount = !string.IsNullOrEmpty(request.TemplateLevel)
    ? entries.Count
    : request.SessionCount;
```
After this change, `entries.Count` will equal the teacher's chosen `sessionCount` (since `CurriculumGenerationService` now generates one entry per session, not per unit). No change needed to this line — it remains correct. Verify in implementation.

`CoursesController.BuildCurriculumContext` passes `SessionCount: req.SessionCount` (line 328). After the frontend sends the teacher's actual chosen value instead of `unitCount`, this flows correctly through to `CurriculumGenerationService` without any backend change.

## Files to create/modify

### Backend
- `backend/LangTeach.Api/Services/SessionMappingService.cs` — NEW (namespace `LangTeach.Api.Services`)
- `backend/LangTeach.Api/DTOs/SessionMappingDtos.cs` — NEW (namespace `LangTeach.Api.DTOs`)
- `backend/LangTeach.Api/Controllers/CurriculumTemplatesController.cs` — add mapping endpoint
- `backend/LangTeach.Api/Services/CurriculumGenerationService.cs` — apply mapping
- `backend/LangTeach.Api.Tests/Services/SessionMappingServiceTests.cs` — NEW (unit tests)

### Frontend
- `frontend/src/api/curricula.ts` — add `getMappingPreview` function
- `frontend/src/components/SessionMappingPreview.tsx` — NEW
- `frontend/src/components/SessionMappingPreview.test.tsx` — NEW
- `frontend/src/pages/CourseNew.tsx` — use mapping preview, show session count with template
- `frontend/src/pages/CourseNew.test.tsx` — add test cases for mapping preview (check existing mock patterns first)
- `e2e/tests/courses.spec.ts` — add happy-path e2e for session mapping flow

### Docs
- `.claude/skills/teacher-qa/output/prior-findings.md` — add row about session mapping

## Test cases (unit)

### `SessionMappingServiceTests`
- `Exact_FourUnitsForSessions_ReturnsFourEntries` (4 units, 4 sessions)
- `Expand_TwelveSessionsForFourUnits_ReturnsTwelveEntries_EvenDistribution`
- `Expand_TenSessionsForFourUnits_DistributesRemainder` (10/4 = 2R2: units 1,2 get 3 sessions each)
- `Compress_FourSessionsForEightUnits_ReturnsFirstFour_ExcludesFour`
- `Edge_OneSession_ReturnsFirstUnit`
- `Edge_OneUnitManySessions_SplitsIntoSubFocuses`
- `Rationale_IsNonEmpty` (rationale populated for all strategies)
- `GrammarFocus_IsStringJoined` (verify `string.Join(", ", unit.Grammar)` for `SessionMappingEntry.GrammarFocus`)

### `CourseNew.test.tsx`
Check existing mock infrastructure (msw handlers, test setup) before writing new cases.
- Shows session count selector when template is selected
- Shows mapping preview card after template + session count selected
- Mapping preview shows excluded units when compress strategy
- Submit sends actual sessionCount, not unit count

### `e2e/tests/courses.spec.ts` (happy-path)
- Teacher selects A1.1 template, chooses 8 sessions (> 4 units)
- Mapping preview card appears showing "expand" strategy
- Teacher clicks Create — course created with 8 entries
- Navigate to course detail, verify 8 curriculum entries present

## Scope notes

- No AI call for the mapping — purely deterministic
- No new DB migrations (existing fields are sufficient)
- No change to the free-generation path (non-template courses unaffected)
- No reordering of units — grammar progression order preserved

## AC checklist

- [ ] Sessions > units: units split into sub-sessions
- [ ] Sessions < units: scope limited, excluded units shown
- [ ] Teacher sees mapping before confirming
- [ ] Grammar progression order preserved
- [ ] Unit tests: all 3 strategies + edge cases
- [ ] Mapping rationale visible
- [ ] Edge: 1 session → first unit, scoped
- [ ] Edge: 1 unit, many sessions → sub-topic splitting
- [ ] prior-findings.md updated for Teacher QA
