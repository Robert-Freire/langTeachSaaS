# Task 151: CEFR Mismatch Warning + Competency Gap Warning

**Issue:** #151 — Warn teacher when lesson/course CEFR level mismatches assigned student level
**Branch:** `worktree-task-t151-cefr-mismatch-warning`
**Sprint:** Student-Aware Curriculum

## Current State (as of 2026-03-25)

**Already implemented and committed:**
- `frontend/src/lib/cefr-colors.ts` - exports `getCefrGap()` and `CEFR_LEVELS`
- `frontend/src/components/CefrMismatchWarning.tsx` - amber dismissible warning component
- `frontend/src/components/CefrMismatchWarning.test.tsx` - unit tests (6 cases)
- `LessonEditor.tsx` - CefrMismatchWarning wired in view mode and edit mode
- `CourseNew.tsx` - CefrMismatchWarning wired for general mode (student + targetCefrLevel)
- `e2e/tests/cefr-mismatch-warning.spec.ts` - happy-path e2e test

**Still missing (remaining AC from issue):**
- Competency gap warning when teacher constraints in `teacherNotes` remove a core skill from 3+ sessions
- Unit tests for `CompetencyGapWarning`
- E2E test for competency gap warning

## Remaining Implementation

### 1. `CompetencyGapWarning` component

File: `frontend/src/components/CompetencyGapWarning.tsx`

Props:
```ts
interface CompetencyGapWarningProps {
  teacherNotes: string
  sessionCount: number
}
```

Utility function `getConstrainedSkills(notes: string): string[]`:
- Parses notes (case-insensitive) for patterns that remove a core CEFR skill
- Returns affected skill names (e.g., `["speaking", "listening"]`)

Keyword to skill mapping:
| Pattern (regex, case-insensitive) | Affected skills |
|-----------------------------------|----------------|
| `no role.?play`, `hates role.?play`, `avoid role.?play` | speaking |
| `written.?only`, `writing.?only` | speaking, listening |
| `no speaking`, `no oral` | speaking |
| `no listening` | listening |
| `no writing` | writing |
| `no reading` | reading |
| `reading.?only` | speaking, listening |
| `oral.?only`, `speaking.?only` | reading, writing |

Component logic:
- `skills = getConstrainedSkills(teacherNotes)`
- If `skills.length === 0` OR `sessionCount < 3`: return null
- Dismissable via X button (same pattern as CefrMismatchWarning: `useState(false)`, `useEffect` resets on prop change)
- Amber warning style: `border-amber-200 bg-amber-50 text-amber-800`
- `data-testid="competency-gap-warning"`

Warning message example:
> "Your teacher notes suggest **speaking** and **listening** may be excluded from these 5 sessions. Removing core skills from multiple sessions may create competency gaps per CEFR guidelines. Is this intentional?"

### 2. Wire into CourseNew.tsx

Add as a **new standalone sibling block** between the teacher notes block and the existing CEFR mismatch warning block:
```tsx
{/* Competency gap warning — shown when teacher notes suggest skill constraints */}
{studentId && teacherNotes.trim() && (
  <CompetencyGapWarning
    teacherNotes={teacherNotes}
    sessionCount={parseInt(sessionCount, 10)}
  />
)}

{/* CEFR mismatch warning (general mode only) — already exists */}
{mode === 'general' && studentId && targetCefrLevel && (...)}
```

Note: do NOT nest inside the existing teacher notes JSX block. It must be a sibling block.

### 3. Unit tests (`CompetencyGapWarning.test.tsx`)

- Shows warning for "written only" notes with sessionCount=5 (mentions speaking + listening)
- Shows warning for "no role-play" notes
- Does NOT show when sessionCount < 3 (even with keywords)
- Does NOT show for empty notes
- Does NOT show when no skill-removing keywords found ("Clara needs formal register")
- Is dismissable via X button
- Resets dismissed state when notes change

### 4. Extend e2e test (`cefr-mismatch-warning.spec.ts`)

Add a second test: competency gap warning appears when teacher notes contain "written only" for a course with 5+ sessions, and can be dismissed.

The teacher notes textarea is only rendered when a student is selected (`studentId` is set). The test must:
1. Create an A1 student (or reuse one created in `beforeAll`) before navigating to course creation
2. Select that student in the student dropdown (to make teacher notes textarea visible)
3. Type "written only" in the teacher notes textarea
4. Assert `data-testid="competency-gap-warning"` is visible and mentions "speaking" and "listening"
5. Dismiss and assert it disappears

Also mock `POST /api/courses` to avoid triggering AI generation (same as existing test).

## Files to change

| File | Action |
|------|--------|
| `frontend/src/components/CompetencyGapWarning.tsx` | Create |
| `frontend/src/components/CompetencyGapWarning.test.tsx` | Create |
| `frontend/src/pages/CourseNew.tsx` | Add CompetencyGapWarning after teacher notes |
| `e2e/tests/cefr-mismatch-warning.spec.ts` | Add competency gap warning test |

## Out of scope

- Backend validation (issue says soft warning only, frontend-only is sufficient)
- Applying competency gap warnings to LessonEditor (no session count concept for single lessons)
- Exam-prep mode (CEFR mismatch already correctly gated to general mode)
