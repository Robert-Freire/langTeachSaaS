# Task 189 — Course Replan Suggestions

**Issue:** #189 — Course replan suggestions: adapt upcoming lessons based on student progress
**Sprint branch:** sprint/adaptive-replanning
**Labels:** P1:must, area:frontend, area:backend, area:ai

---

## Acceptance Criteria

- [ ] System compares planned curriculum coverage vs. actual (from reflections)
- [ ] System identifies gaps (grammar points not yet covered, areas needing reinforcement)
- [ ] Suggestions are generated with clear reasoning
- [ ] Teacher can accept, modify (edit the proposed lesson plan change inline before applying), or dismiss each suggestion
- [ ] Accepted suggestions update upcoming lesson plans in the course
- [ ] Suggestion history is viewable (what was suggested, what was accepted)

---

## Context

Dependencies already merged:
- **#187** (post-class reflections): `LessonNote.AreasToImprove`, `LessonNote.WhatWasCovered`, `LessonNote.EmotionalSignals` all populated via AI extraction
- **#188** (difficulty updates): `Student.Difficulties` JSON array, `Student.SkillLevelOverrides`
- Existing data: `CurriculumEntry.Status` tracks planned/created/taught; `CurriculumEntry.PersonalizationNotes` and `ContextDescription` hold adaptive context

When accepted, a suggestion updates the targeted `CurriculumEntry.PersonalizationNotes` to embed the change for the next lesson generation.

---

## Data Model

### New: `CourseSuggestion`

```csharp
public class CourseSuggestion
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Course Course { get; set; } = null!;

    // Which upcoming lesson this suggestion targets (nullable: may be a general replan note)
    public Guid? CurriculumEntryId { get; set; }
    public CurriculumEntry? CurriculumEntry { get; set; }

    public string ProposedChange { get; set; } = "";     // What to change
    public string Reasoning { get; set; } = "";          // Why (evidence from notes/difficulties)
    public string Status { get; set; } = "pending";      // pending | accepted | dismissed

    // Teacher's inline edit before accepting (null = accepted as-is)
    public string? TeacherEdit { get; set; }

    public DateTime GeneratedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}
```

Migration: `AddCourseSuggestions` — adds `CourseSuggestions` table with FK to `Courses` and nullable FK to `CurriculumEntries`.

---

## Backend

### DTOs

**`CourseSuggestionDto`**
```csharp
record CourseSuggestionDto(
    Guid Id,
    Guid CourseId,
    Guid? CurriculumEntryId,
    string? CurriculumEntryTopic,    // denormalized for display
    string ProposedChange,
    string Reasoning,
    string Status,
    string? TeacherEdit,
    DateTime GeneratedAt,
    DateTime? RespondedAt
)
```

**`RespondToSuggestionRequest`**
```csharp
record RespondToSuggestionRequest(
    string Action,          // "accept" | "dismiss"
    string? TeacherEdit     // if set + action="accept", saves edited version
)
```

### New Service: `IReplanSuggestionService`

```csharp
public interface IReplanSuggestionService
{
    Task<List<CourseSuggestionDto>> GenerateSuggestionsAsync(Guid courseId, Guid teacherId);
    Task<List<CourseSuggestionDto>> GetSuggestionsAsync(Guid courseId, Guid teacherId);
    Task<CourseSuggestionDto> RespondAsync(Guid suggestionId, Guid teacherId, string action, string? teacherEdit);
}
```

**`ReplanSuggestionService`** implementation:
1. Load course + entries (status != "taught" filtered as "upcoming")
2. Load `LessonNote`s for this course via join: `LessonNote.LessonId -> CurriculumEntry.LessonId -> CurriculumEntry.CourseId == courseId` (LessonNote has no CourseId directly)
3. Load `Student.Difficulties` and `Student.SkillLevelOverrides`
4. Call `PromptService.BuildReplanSuggestionsPrompt(...)` with gathered context
5. Send to Claude (Haiku), parse JSON response: `[{curriculumEntryId?, proposedChange, reasoning}]`
6. Persist as `CourseSuggestion` rows (status = "pending"), replacing any existing pending suggestions for this course
7. On `RespondAsync("accept", ...)`: set status = "accepted", apply change to `CurriculumEntry.PersonalizationNotes` (append or replace), set `RespondedAt`
8. On `RespondAsync("accept", teacherEdit)`: save `TeacherEdit`, apply `teacherEdit` text to `PersonalizationNotes`
9. On `RespondAsync("dismiss", ...)`: set status = "dismissed"

### New Prompt: `PromptService.BuildReplanSuggestionsPrompt`

Input context record:
```csharp
record ReplanSuggestionsContext(
    string StudentName,
    string TargetCefrLevel,            // matches Course.TargetCefrLevel
    List<string> StudentDifficulties,
    List<TaughtEntry> TaughtEntries,   // topic, grammarFocus, areasToImprove from LessonNotes
    List<PlannedEntry> PlannedEntries  // id, orderIndex, topic, grammarFocus, competencies
)
```

System prompt: teacher-oriented, focused on gap analysis and pedagogical continuity.

User prompt instructs Claude to:
- Identify gaps between what was taught vs. what was planned (AreasToImprove not yet addressed in upcoming lessons)
- Identify student difficulties not covered by upcoming lessons
- Return JSON: `{"suggestions":[{"curriculumEntryId":"..or null","proposedChange":"...","reasoning":"..."}]}`
- Limit to 3-5 high-value suggestions max

### New Controller: `CourseSuggestionsController`

```
POST /api/courses/{courseId}/suggestions/generate
    -> 200 List<CourseSuggestionDto>

GET  /api/courses/{courseId}/suggestions
    -> 200 List<CourseSuggestionDto>   (all: pending + history)

POST /api/courses/{courseId}/suggestions/{id}/respond
    body: RespondToSuggestionRequest
    -> 200 CourseSuggestionDto
```

All endpoints require `[Authorize]` and verify `teacherId` ownership of the course.

### Unit Tests

`ReplanSuggestionServiceTests`:
- `GenerateSuggestions_ParsesAiResponse_AndPersists`
- `RespondAccept_UpdatesCurriculumEntry_PersonalizationNotes`
- `RespondAcceptWithEdit_AppliesTeacherEdit`
- `RespondDismiss_SetsStatusDismissed`
- `GenerateSuggestions_ReplacesExistingPending`

---

## Frontend

### API module: `frontend/src/api/courseSuggestions.ts`

Types:
```ts
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed'

export interface CourseSuggestion {
  id: string
  courseId: string
  curriculumEntryId: string | null
  curriculumEntryTopic: string | null
  proposedChange: string
  reasoning: string
  status: SuggestionStatus
  teacherEdit: string | null
  generatedAt: string
  respondedAt: string | null
}

export interface RespondToSuggestionRequest {
  action: 'accept' | 'dismiss'
  teacherEdit?: string
}
```

Functions: `generateSuggestions(courseId)`, `getSuggestions(courseId)`, `respondToSuggestion(courseId, id, req)`.

### Frontend Component: `CourseSuggestionsPanel`

Location: `frontend/src/components/course/CourseSuggestionsPanel.tsx`

UI layout:
- Header: "Adaptive suggestions" with "Generate" button (spinner while loading)
- Pending suggestions section: card per suggestion showing:
  - Target lesson topic (or "General course") with OrderIndex pill
  - Reasoning text (smaller, muted)
  - ProposedChange text (main content)
  - Action row: [Accept] [Edit & Accept] [Dismiss]
  - "Edit & Accept" reveals inline textarea pre-filled with proposedChange, then [Confirm] button
- History section (collapsible): accepted/dismissed suggestions with status badge and respondedAt date
- Empty state: "No suggestions yet. Click Generate to analyse recent lessons."

### Integration in CourseDetail.tsx

CourseDetail currently has no tab navigation. This task introduces a simple two-tab layout ("Curriculum" | "Suggestions") using a local `activeTab` state and conditional rendering. The existing curriculum list moves under the Curriculum tab; the new `CourseSuggestionsPanel` renders under the Suggestions tab.

Use `useQuery(['course-suggestions', courseId], ...)` with invalidation after generate/respond mutations.

Show a banner on the course detail page if there are pending suggestions: "X adaptive suggestions ready to review" with link to Suggestions tab.

### Unit Tests

`CourseSuggestionsPanel.test.tsx`:
- Renders empty state when no suggestions
- Shows pending suggestion cards
- Accept calls respondToSuggestion with action=accept
- Edit & Accept shows textarea, confirm calls with teacherEdit
- Dismiss calls respondToSuggestion with action=dismiss
- History section shows accepted/dismissed items

---

## E2E Test: `course-replan-suggestions.spec.ts`

Fixture requirement: The test must create its own data programmatically via `db-helper.ts`. Specifically: create a course with a student, add 2 curriculum entries (1 "taught" with a linked LessonNote containing AreasToImprove, 1 "planned"), then run the suggestion flow. Do NOT rely on named students from other specs; their LessonNotes may not have AreasToImprove populated.

Scenario:
1. Navigate to a course with taught lessons and lesson notes
2. Click "Generate" suggestions
3. Confirm suggestions panel shows at least 1 card
4. Accept first suggestion -> card moves to history, curriculum entry updated
5. Dismiss second suggestion -> card moves to history with "Dismissed" badge
6. Edit & Accept third: modify text, confirm -> history shows edited version
7. Verify history is visible after reload

---

## Files Modified

**Backend:**
- `backend/LangTeach.Api/Data/Models/CourseSuggestion.cs` (new)
- `backend/LangTeach.Api/Data/AppDbContext.cs` (add DbSet + FK config)
- `backend/LangTeach.Api/Migrations/` (new migration AddCourseSuggestions)
- `backend/LangTeach.Api/DTOs/CourseSuggestionDtos.cs` (new)
- `backend/LangTeach.Api/AI/PromptService.cs` (add BuildReplanSuggestionsPrompt)
- `backend/LangTeach.Api/Services/IReplanSuggestionService.cs` (new)
- `backend/LangTeach.Api/Services/ReplanSuggestionService.cs` (new)
- `backend/LangTeach.Api/Controllers/CourseSuggestionsController.cs` (new)
- `backend/LangTeach.Api/Program.cs` (register IReplanSuggestionService)
- `backend/LangTeach.Api.Tests/Services/ReplanSuggestionServiceTests.cs` (new)

**Frontend:**
- `frontend/src/api/courseSuggestions.ts` (new)
- `frontend/src/components/course/CourseSuggestionsPanel.tsx` (new)
- `frontend/src/components/course/CourseSuggestionsPanel.test.tsx` (new)
- `frontend/src/pages/CourseDetail.tsx` (add tab layout + Suggestions tab)
- `frontend/src/pages/CourseDetail.test.tsx` (update for new tab)

**E2E:**
- `e2e/tests/course-replan-suggestions.spec.ts` (new)

## Implementation Order

1. Backend model + AppDbContext + migration
2. PromptService.BuildReplanSuggestionsPrompt + ReplanSuggestionService + unit tests
3. CourseSuggestionsController + Program.cs registration
4. Frontend API module
5. CourseSuggestionsPanel component + unit test
6. CourseDetail.tsx tab integration
7. E2E test

---

## Out of Scope

- Notifications / push alerts for new suggestions
- Automatic background suggestion generation (teacher-triggered only)
- AI-generated lesson plan content (suggestion applies to PersonalizationNotes only; full lesson regeneration is a separate step the teacher already has)
