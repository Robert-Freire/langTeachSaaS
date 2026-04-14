# Task 721: Student Detail Profile Tab - Stitch Alignment & Inline-Add

## Issue
[#721](https://github.com/Robert-Freire/langTeachSaaS/issues/721) - polish: Student Detail Profile tab Stitch alignment and inline-add

## Stitch Reference
`plan/langteach-beta/stitch-design-system/student-detail/2. profile/` (DESIGN.md, code.html, screen.png)

## Acceptance Criteria Checklist

- [ ] Column proportions ~60-65% left, ~35-40% right (grid-cols-12, col-span-8 / col-span-4)
- [ ] Right column order: (1) Working Memory sidebar, (2) Language Ecosystem, (3) Interests, (4) Commercial, (5) Teaching Todos, (6) Pending Followups
- [ ] Motivation banner: Manrope large typography, key phrase highlighted in indigo italic, interest chips inside banner
- [ ] Pedagogical Diagnostic tonal card with graduation-cap/analytics icon, containing: Learning Goals, Short-Term Objectives, Skill Assessment, Focus Areas & Difficulties
- [ ] Skill Assessment as horizontal 4-column large square CEFR badges inside Pedagogical Diagnostic card
- [ ] Focus Areas & Difficulties table inside the Pedagogical Diagnostic tonal card
- [ ] Teacher's Working Memory: unified section merging Sensitivities + Pedagogical Observations, dark tonal background
- [ ] Right column: Working Memory sidebar card (Profession, Born+age, Origin, Residence) at top
- [ ] Section header visual weight differentiated via tonal layering
- [ ] Inline-add for Learning Goals (+ icon in header, inline text input; LearningGoalTreeEditor remains for full-form edit)
- [ ] Inline-add for Short-Term Objectives (+ icon in header, inline text input; date not required for quick add)
- [ ] Inline-add for Focus Areas & Difficulties (+ icon in header, inline competency + description inputs)
- [ ] Collapse unpopulated secondary sections with expand toggle (keep Motivation, Language Ecosystem, Pedagogical Diagnostic always visible)
- [ ] Unit tests updated for new layout, new inline-add interactions
- [ ] E2E test: inline-add Learning Goal on profile tab

## Architecture

### No infrastructure gap
The inline-add for Learning Goals, Short-Term Objectives, and Difficulties will follow the same pattern as Interests and Reason (existing): call `updateStudent` via `buildStudentPayload()` with the appended item. The PUT endpoint supports all fields.

New callbacks wired in `StudentDetail.tsx`:
- `onSaveLearningGoal(text: string): Promise<void>` - appends `{ id: newId(), text, children: [] }` (use existing `newId()` helper from LearningGoalTreeEditor or inline same fallback)
- `onSaveShortTermObjective(text: string): Promise<void>` - appends `{ id: newId(), text, targetDate: null }`
- `onSaveDifficulty(vars: { competency: string; description: string }): Promise<void>` - appends with defaults (severity: 'medium', trend: 'stable', status: 'Active', subcategory: '')

Note: All three callbacks must use `mutateAsync` (not `mutate`) so they return a `Promise<void>`, consistent with existing `saveReasonForStudying` / `saveInterests` pattern.

### Key design decisions

**Hero banner shape:** Stitch uses `rounded-full` (= 0.75rem per custom config, not full pill) with a decorative circle in top-right corner. Replicate with `rounded-xl` + relative overflow-hidden + decorative bleed.

**Motivation key phrase highlight:** The highlighted phrase uses `text-primary italic`. Since we don't have NLP to auto-detect key phrases, we highlight the first sentence or the student's stated core goal. For simplicity: highlight the **last sentence** (or the whole quote if it's short). An alternative: the teacher can click to toggle which part is highlighted - out of scope for this task. Simple approach: apply indigo italic to the entire quote text (keeps the spirit without requiring phrase detection).

Actually, re-reading the AC: "key phrase highlighted in indigo italic" - looking at the Stitch HTML, the whole quote is in large Manrope, and a span within it is `text-primary italic`. Since we can't programmatically determine the key phrase, we'll render the full quote in Manrope large and apply indigo italic to the entire thing (consistent with the spirit). No need for phrase detection.

**Skill Assessment location:** Moves from right column to inside Pedagogical Diagnostic card (left column). The right column no longer has a separate Skill Assessment section.

**Empty state collapse:** A section is "collapsible" if it has no data AND is not in the priority set (Motivation, Language Ecosystem, Pedagogical Diagnostic). Collapsible sections start collapsed. A "Show more sections" expander at the bottom of each column reveals them. Implementation: `useState<boolean>` for `showEmptySections` defaulting to `false`.

## Files to Change

### 1. `frontend/src/components/student/StudentProfileTab.tsx`
Major restructure:
- Change outer grid from `grid-cols-1 lg:grid-cols-5` to `grid-cols-1 lg:grid-cols-12`
- Left col: `lg:col-span-8`, right col: `lg:col-span-4`
- Hero: Manrope `text-2xl lg:text-3xl font-extrabold`, indigo italic for whole quote text, interests chips inside banner
- Left column layout (top to bottom):
  1. Pedagogical Diagnostic card (white, shadow, rounded-xl, `GraduationCap` or `BookOpen` icon): contains Learning Goals (with inline-add), Short-Term Objectives (with inline-add), Skill Assessment (4-col horizontal badges), Focus Areas & Difficulties (with inline-add)
  2. Teacher's Working Memory (dark tonal bg, merged personalNotes + teachingNotes)
- Right column layout (top to bottom):
  1. Working Memory sidebar: Profession, Born (age calc), Origin, Residence
  2. Language Ecosystem
  3. Interests (with existing inline-edit)
  4. Commercial
  5. Teaching Todos
  6. Pending Followups
- Inline-add affordances (+ button in section header for Learning Goals, Short-Term Objectives, Difficulties)
- Empty state collapse for sections with no data

New props on `StudentProfileTab`:
```tsx
onSaveLearningGoal?: (text: string) => Promise<void>
onSaveShortTermObjective?: (text: string) => Promise<void>
onSaveDifficulty?: (vars: { competency: string; description: string }) => Promise<void>
```

### 2. `frontend/src/pages/StudentDetail.tsx`
Add three new save callbacks using `mutateAsync` (same pattern as `saveReasonForStudying`/`saveInterests`):
```tsx
const saveLearningGoalMutation = useMutation({
  mutationFn: (text: string) => {
    const newGoal = { id: newId(), text, children: [] }
    return updateStudent(id!, { ...buildStudentPayload(), learningGoals: [...student!.learningGoals, newGoal] })
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student', id] }),
})

const saveShortTermObjectiveMutation = useMutation({
  mutationFn: (text: string) => {
    const newObj = { id: newId(), text, targetDate: null }
    return updateStudent(id!, { ...buildStudentPayload(), shortTermObjectives: [...student!.shortTermObjectives, newObj] })
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student', id] }),
})

const saveDifficultyMutation = useMutation({
  mutationFn: ({ competency, description }: { competency: string; description: string }) => {
    const newDiff = { id: newId(), competency, description, subcategory: '', severity: 'medium', trend: 'stable', status: 'Active' }
    return updateStudent(id!, { ...buildStudentPayload(), difficulties: [...student!.difficulties, newDiff] })
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student', id] }),
})
```

Wire as props (using `.then(() => {})` wrapper like existing patterns):
```tsx
onSaveLearningGoal={(text) => saveLearningGoalMutation.mutateAsync(text).then(() => {})}
onSaveShortTermObjective={(text) => saveShortTermObjectiveMutation.mutateAsync(text).then(() => {})}
onSaveDifficulty={(vars) => saveDifficultyMutation.mutateAsync(vars).then(() => {})}
```

The `newId()` helper: inline the same fallback used in LearningGoalTreeEditor:
```tsx
function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

### 3. `frontend/src/components/student/StudentProfileTab.test.tsx`
- Update layout assertions (col-span-8 / col-span-4 not 3/2)
- Add tests for: inline-add goal shows input on + click, confirms save, hides on cancel
- Add tests for: inline-add objective, inline-add difficulty
- Add test for empty state collapse (secondary empty sections hidden initially, show after toggle)

### 4. `e2e/tests/student-detail.spec.ts`
- Add test: navigate to profile tab for Ana Visual, click + on Learning Goals, type goal, press Enter, verify it appears in the list

## Implementation Steps

1. Add new callbacks in `StudentDetail.tsx`
2. Implement inline-add sub-components in `StudentProfileTab.tsx`:
   - `InlineAddGoal` - text input, Enter to save, Escape to cancel
   - `InlineAddObjective` - text input (date optional, out of scope for now)
   - `InlineAddDifficulty` - two inputs: competency (select or text) + description
3. Restructure `StudentProfileTab.tsx` layout (grid-cols-12, left 8 / right 4)
4. Redesign Motivation hero banner (Manrope, indigo italic, chips inside)
5. Create Pedagogical Diagnostic tonal card with horizontal skill badges inside
6. Move Skill Assessment into Pedagogical Diagnostic card
7. Move Focus Areas & Difficulties into Pedagogical Diagnostic card (tonal sub-card)
8. Unify Teacher's Working Memory (merge personal + teaching notes, dark bg)
9. Reorder right column per Isaac's pedagogical order
10. Add Working Memory sidebar card (top of right column)
11. Implement empty state progressive disclosure
12. Update unit tests
13. Add e2e test

## E2E Student
Use "Ana Visual" for the profile tab e2e inline-add test. Note: Ana Visual starts with no LearningGoals in the seeder (only Difficulties/Weaknesses), so the test will add to an empty list - that is fine and actually tests the empty-state + inline-add path together. For verifying existing goals rendering, "Ana Seed" is the correct rich-profile student.

## Test Data Note
The inline-add e2e test will create a new learning goal and verify it appears. The test should clean up (or use a fresh student). Since e2e uses the full stack, the save will persist to the DB for the duration of the test run - acceptable.
