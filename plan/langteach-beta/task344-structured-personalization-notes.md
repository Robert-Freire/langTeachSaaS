# Task 344: Structured format for curriculum personalization notes

**Issue:** #344  
**Branch:** `worktree-task-t344-structured-personalization-notes`  
**Sprint:** `sprint/adaptive-replanning`

## Problem

`CurriculumEntry.ContextDescription` and `PersonalizationNotes` are free-text strings.
When Adaptive Replanning needs to parse/update them programmatically, free-text is fragile.

## Approach

Keep the existing `nvarchar(max)` string columns -- no DB migration needed. Change what we store:
structured JSON. A coercion layer in `CourseService` handles legacy free-text rows gracefully.

**Why no column type change:** EF Core owned-entity JSON requires SQL Server 2022 (`json` column type).
Our current setup uses `nvarchar(max)` with manual JSON serialization; we get the same result without
a destructive migration or a SQL Server version dependency. Sophy reviews this trade-off.

## Schemas

### `ContextDescriptionData`
```json
{ "setting": "Barcelona registration office", "scenario": "Marco tells the clerk his name and phone number" }
```
- `setting`: physical/social place drawn from the student's life
- `scenario`: the sentence describing the student's action in that setting

### `PersonalizationNotesData`
```json
{
  "emphasisAreas": ["ser/estar contrast practice"],
  "constraints": ["written exercises only (teacher note: no role-play)"],
  "l1Notes": ["false cognates with French -- confondre vs confundir"]
}
```
- `emphasisAreas`: mapped from student weaknesses spread across sessions
- `constraints`: teacher-note compliance items
- `l1Notes`: L1-interference observations (populated only when `StudentNativeLanguage` is set)

## Coercion for legacy free-text

When deserializing from DB:
- `null` -> stays `null`
- valid JSON -> deserialize to typed record
- invalid JSON (legacy plain text) ->
  - `ContextDescription`: wrap as `{ setting: "", scenario: <text> }`
  - `PersonalizationNotes`: wrap as `{ emphasisAreas: [<text>], constraints: [], l1Notes: [] }`

This means old rows still render something meaningful without a data migration.

**Coercion placement:** The project uses `JsonStorageHelper` (already exists) for JSON column deserialization.
Add a new `DeserializeWithFallback<T>(string? json, Func<string, T> legacyCoerce)` method there.
`CourseService.MapEntryToDto` calls it via `JsonStorageHelper` -- consistent with the established pattern.

## Files to change

### Backend

| File | Change |
|------|--------|
| `Data/Models/PersonalizationData.cs` (new) | C# records `ContextDescriptionData`, `PersonalizationNotesData` |
| `AI/PromptService.cs` line ~1317 | Update JSON format instruction to output nested objects |
| `Services/CurriculumGenerationService.cs` | Change `PersonalizationDto` fields `ContextDescription`/`PersonalizationNotes` from `string?` to the new C# record types (`ContextDescriptionData?`, `PersonalizationNotesData?`). `JsonSerializer.Deserialize<List<PersonalizationDto>>` at line 185 reads the AI-returned nested objects directly into those typed fields. `ApplyPersonalization` then writes `skeleton.ContextDescription = JsonSerializer.Serialize(p.ContextDescription)` to store back as a JSON string in the entity. This is an intentional deserialize-then-reserialize: the entity column stays `string?`, the service layer handles the shape contract. |
| `DTOs/CourseDto.cs` | Change `CurriculumEntryDto` fields from `string?` to typed records |
| `Services/CourseService.cs` line ~357 | Deserialize with coercion when building DTO |
| `AI/PromptService.cs` ~1280-1300 | Adjust description of the three sub-fields in the prompt text |

### Frontend

| File | Change |
|------|--------|
| `api/courses.ts` | Update TypeScript types to match structured response |
| `pages/CourseDetail.tsx` ~365-387 | Render structured fields (separate labels for setting/scenario, chips for arrays) |
| `pages/CourseDetail.test.tsx` | Update mock data + rendering assertions |

### Tests

| File | Change |
|------|--------|
| `LangTeach.Api.Tests/Services/CurriculumGenerationServiceTests.cs` | Update mock AI output to new JSON shape |
| `e2e/tests/courses.spec.ts` | Verify curriculum walkthrough still shows context + notes |

## Acceptance criteria mapping

| AC | How covered |
|----|-------------|
| Define structured schema for PersonalizationNotes | `PersonalizationNotesData` C# record + TypeScript type |
| Define structured schema for ContextDescription | `ContextDescriptionData` C# record + TypeScript type |
| Update AI generation to produce structured output | PromptService format instruction + GenerationService serialization |
| Update curriculum walkthrough UI to render structured fields | CourseDetail.tsx rendering |
| Migration for existing data (coercion layer) | CourseService deserialization with legacy fallback |
| Data model changes reviewed by Sophy | Sophy agent in review phase |

## Review routing

- `review` agent (always)
- `architecture-reviewer` agent (always)
- `sophy` agent (required by AC; review the no-migration / coercion-layer decision)
- `prompt-health` agent: NOT triggered. The PromptService change only updates the JSON format
  instruction (output shape), it does not add new instructional content or rule blocks.
- `review-ui` agent: NOT triggered. The issue has neither `area:frontend` nor `area:design` label.
  The CourseDetail.tsx change is cosmetic/additive rendering of already-fetched data.

## E2E

The existing `courses.spec.ts` walkthrough test exercises this area. Extend it to assert that
personalization context and notes sections are visible and contain structured content (not just
any string). Use the existing Marco student (A1, has weaknesses and L1=German) so there is seed
data for personalized curriculum generation without needing a new fixture.
