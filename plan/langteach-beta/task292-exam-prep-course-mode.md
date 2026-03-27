# Task 292: Exam Prep Mode in Course Generation (Course-Level)

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/292

## Status
Planning

## What's Already Implemented

The scaffolding from issue #228 (lesson-level exam prep) was already partly extended to the course level:

- `CourseNew.tsx`: mode toggle (General Learning / Exam Preparation), exam selector, exam date picker, passes mode/targetExam/examDate to API
- `Course.cs` model: `Mode`, `TargetExam`, `ExamDate` fields
- `CourseDto.cs`: exposes `TargetExam`, `ExamDate`
- `CoursesController.cs`: validates `TargetExam` required when `Mode == "exam-prep"`; rejects templates with exam-prep mode
- `CurriculumContext`: already carries `Mode`, `TargetExam`, `ExamDate`
- `PromptService.CurriculumUserPrompt()`: already branches on `ctx.Mode == "exam-prep"` with exam type + deadline
- `CourseDetail.tsx`: shows Mode chip in summary header
- `CurriculumEntry.LessonType`: stored and shown in expanded details
- Frontend unit tests: mode toggle renders, switches to exam-prep, shows exam fields
- E2E test: basic exam-prep creation flow (mock API)

## What's Missing (Gaps vs Acceptance Criteria)

### AC1+2+3: UI fields (already done — no action needed)
CourseNew already has: mode toggle, exam selector, exam date picker. These pass to the API. ✓

### AC4: "At least one mock test session and one strategy session in 8+ session plan"

The current `CurriculumUserPrompt` for exam-prep mode just says `lessonType (string, e.g. Communicative, Grammar-focused, Exam Practice, Mixed)`. It doesn't define specific exam session types or mandate their presence.

**Fix:** Enhance `PromptService.CurriculumUserPrompt()` exam-prep branch to:
- Define 3 specific session types: `Input Session`, `Strategy Session`, `Mock Test`
- Mandate ≥1 Mock Test and ≥1 Strategy Session when sessionCount ≥ 8
- Add deadline-aware pacing guidance (input/skills-building early, strategy in middle third, mock test(s) in final third)

### AC5: "CourseDetail visually marks session type in exam prep mode"

Currently `lessonType` is shown inside the expanded details as a plain badge mixed with competencies. For exam-prep courses it should be visible in the **collapsed row** without expanding.

**Fix:**
- Pass `courseMode: string` prop to `SortableEntryRow`
- When `courseMode === 'exam-prep'` and `entry.lessonType` is set, render a colored badge in the collapsed row header alongside the status badge
- Color scheme: "Mock Test" → amber/orange, "Strategy Session" → purple, "Input Session" → blue, anything else → zinc

### AC6: "Unit test: exam prep fields are required when mode is exam prep"

The `isValid` guard already requires `targetExam` for exam-prep mode (line 111 in CourseNew.tsx). Need a unit test asserting the Generate button is disabled when mode=exam-prep and no exam is selected.

**Where:** `CourseNew.test.tsx` — add one test.

### AC7: "Unit test: prompt includes exam type and deadline when mode is exam prep"

No test for this in `PromptServiceTests.cs`.

**Where:** `PromptServiceTests.cs` — add 2 tests:
1. `CurriculumPrompt_ExamPrep_IncludesExamTypeAndDeadline` — checks exam name + date appear in the prompt user message
2. `CurriculumPrompt_ExamPrep_RequiresMockTestAndStrategySession` — checks the session type guidance appears (for sessionCount ≥ 8)

### AC8: "E2E test: create exam prep course → verify at least one session is labeled as mock test or strategy"

The existing e2e test (`create course (exam-prep mode)`) mocks the API response but doesn't include sessions with mock test labels.

**Where:** `e2e/tests/courses.spec.ts` — extend the existing exam-prep test to:
- Include at least one entry with `lessonType: "Mock Test"` in the mock course response
- Assert the CourseDetail renders a visible "Mock Test" badge

## Implementation Plan

### Step 1: Backend — Enhance exam-prep curriculum prompt

File: `backend/LangTeach.Api/AI/PromptService.cs`

In `CurriculumUserPrompt()`, replace the current exam-prep branch:
```csharp
if (ctx.Mode == "exam-prep")
{
    var exam = Sanitize(ctx.TargetExam);
    var dateStr = ctx.ExamDate.HasValue ? ctx.ExamDate.Value.ToString("yyyy-MM-dd") : "unspecified";
    sb.AppendLine($"Design a {ctx.SessionCount}-session {language} exam preparation course for {exam} (exam date: {dateStr}).");
    sb.AppendLine("Each session should target specific exam sections and skill areas.");
}
```

With an enhanced version that:
- Defines 3 session types with descriptions
- Mandates at least 1 Mock Test + 1 Strategy Session when sessionCount >= 8
- Provides deadline-aware pacing guidance
- Instructs `lessonType` field to use one of the 3 defined types

### Step 2: Frontend — Session type badge in CourseDetail collapsed row

File: `frontend/src/pages/CourseDetail.tsx`

1. Add `courseMode: string` to `SortableEntryRowProps`
2. Pass `course.mode` from the parent `CourseDetail` component
3. In the collapsed row, after the status badge, add:
   ```tsx
   {courseMode === 'exam-prep' && entry.lessonType && (
     <ExamSessionTypeBadge type={entry.lessonType} />
   )}
   ```
4. Implement `ExamSessionTypeBadge` inline function:
   - "Mock Test" → amber-100/amber-700 with border
   - "Strategy Session" → purple-50/purple-700 with border
   - "Input Session" → blue-50/blue-700 with border
   - other → zinc-50/zinc-500
5. Add `data-testid={`session-type-badge-${idx}`}` for test targeting

### Step 3: Backend unit tests — PromptService

File: `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`

Add 2 tests under a new `CurriculumPrompt_ExamPrep` region/section:
1. Prompt user message contains exam name and date
2. Prompt user message contains session type guidance (Mock Test, Strategy Session) when sessionCount >= 8

### Step 4: Frontend unit test — CourseNew exam-prep validation

File: `frontend/src/pages/CourseNew.test.tsx`

Add test: "generate button is disabled when mode is exam-prep and no exam is selected"

### Step 5: Frontend unit test — CourseDetail session type badge

File: `frontend/src/pages/CourseDetail.test.tsx`

Add test: "shows exam session type badge in collapsed row for exam-prep course"

### Step 6: E2E test

File: `e2e/tests/courses.spec.ts`

Extend `create course (exam-prep mode)` test to:
- Include `{ ..., lessonType: 'Mock Test' }` and `{ ..., lessonType: 'Strategy Session' }` entries in the mock `GET /api/courses/:id` response
- After navigation to CourseDetail, assert `session-type-badge-*` renders with "Mock Test" text visible

## Files to Touch

### Backend
- `backend/LangTeach.Api/AI/PromptService.cs` — enhance exam-prep curriculum prompt
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` — 2 new tests

### Frontend
- `frontend/src/pages/CourseDetail.tsx` — session type badge in collapsed row
- `frontend/src/pages/CourseDetail.test.tsx` — 1 new test
- `frontend/src/pages/CourseNew.test.tsx` — 1 new test

### E2E
- `e2e/tests/courses.spec.ts` — extend exam-prep test

## No DB Migration Needed

All required fields (`LessonType` on `CurriculumEntry`, `Mode`/`TargetExam`/`ExamDate` on `Course`) already exist. No schema changes.

## Notes

- The `lessonType` field was always included in the AI JSON response schema; we're just enhancing what values the AI is expected to produce for exam-prep courses and making them visually prominent.
- The exam-prep curriculum prompt enhancements don't affect general-mode courses at all (separate code path).
- No changes to `CreateCourseRequest` DTO needed — all fields already present.
- **Verified:** `getCourse()` fetches `GET /api/courses/:id` which returns `entries: CurriculumEntry[]` inline. The e2e mock for Step 6 must extend the `GET /api/courses/:id` mock response to include entries with `lessonType` values. No separate curriculum sub-route is involved.
- **CourseDetail unit test (Step 5):** Use a custom course fixture with `mode: 'exam-prep'` and at least one entry with `lessonType: 'Mock Test'`. The existing test helpers may need a new `EXAM_PREP_COURSE` fixture.
