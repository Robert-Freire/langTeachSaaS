# Task #664: Motivation Fields (ReasonForStudying, ShortTermObjectives, LearningGoals, Interests)

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/664

## Context

All backend fields exist. This is purely frontend work. The task adds:
- ReasonForStudying: hero quote on Profile tab + inline edit + edit form field
- ShortTermObjectives: urgency treatment on Profile tab + edit form list + Overview tab Primary Objective card
- LearningGoals: bullet list in Pedagogical Diagnostic on Profile tab (was chips -- gap from #667)
- Interests: tags in hero section + dedicated editable section on Profile tab right column (was missing -- gap from #667)

Design reference: `plan/langteach-beta/student-screen-field-mapping.md` (approved 2026-04-11).

## Acceptance Criteria (from issue)

- [ ] ReasonForStudying editable in create/edit forms AND inline on Profile tab (ghost pencil)
- [ ] ReasonForStudying renders as hero italic quote on Profile tab with interests beside it
- [ ] Interests render as tags beside the quote when data exists
- [ ] Interests have a dedicated editable section on Profile tab right column
- [ ] LearningGoals render as bullet list in Pedagogical Diagnostic when data exists
- [ ] ShortTermObjectives editable with add/remove/edit in the edit form
- [ ] Each objective supports optional TargetDate via date picker
- [ ] Profile tab shows objectives with "OVERDUE" label (red) when past due
- [ ] Profile tab shows "Critical" treatment (red border) for objectives within 6 weeks
- [ ] Past-due and upcoming objectives are visually distinct
- [ ] Overview tab Primary Objective card shows first objective with days remaining
- [ ] No "65% Ready" or completion percentage
- [ ] Follows Stitch design

## Architecture

### Component changes

**`StudentProfileTab.tsx`** -- largest change:
- Add "The Why / Motivacion" hero section above the grid (ReasonForStudying + Interests tags)
- Inline edit for ReasonForStudying: local `editingReason` state, pencil-on-hover, textarea + save/cancel
- Interests editable section on right column: local `editingInterests` state, tag add/remove
- Change LearningGoals rendering from chips to bullet list (add to left column "Pedagogical Diagnostic")
- ShortTermObjectives urgency logic:
  - `targetDate < today` => "OVERDUE" red label
  - `targetDate within 42 days` => "Critical" red border
  - No chevron arrows
- Props add: `onSaveReasonForStudying?: (value: string) => Promise<void>` and `onSaveInterests?: (value: string[]) => Promise<void>`

**`StudentDetail.tsx`**:
- Add "overview" tab to `tabs` array (before "profile")
- New `activeTab === 'overview'` block renders `StudentOverviewTab`
- Add `mutate: updateReasonForStudying` and `updateInterests` mutations (same pattern as `toggleDifficultyStatus`)
- Pass callbacks to `StudentProfileTab`

**New `StudentOverviewTab.tsx`** (new file):
- Primary Objective card: shows first (most urgent) `shortTermObjectives` item
  - Text + target date + days remaining (positive = "N days left", 0 = "today", negative = "OVERDUE")
  - No progress %, no chevrons
- TeachingTodosCard (already implemented, also stays in Profile tab -- per field mapping, both tabs show it)
- StudentFollowupsCard (already implemented, also stays in Profile tab -- per field mapping, both tabs show it)
- Empty state if no objectives
- Note: TeachingTodosCard and StudentFollowupsCard are NOT removed from StudentProfileTab; they appear on both tabs per field mapping design.

**`StudentForm.tsx`**:
- Add `reasonForStudying` state (string)
- Add `shortTermObjectives` state (array of `{ id: string; text: string; targetDate: string | null }`)
- Sync both from `existing` in `useEffect`
- Include both in `mutate()` call
- Add "ReasonForStudying" textarea to Personal Background card (right column or below existing fields)
- Add "Teaching Goals" card with:
  - LearningGoals multi-select (move from Teaching Context card OR add section header inside it)
  - ShortTermObjectives list: text input + `<input type="date">` + remove button + "Add Objective" button
  - "NEAR DATE" warning: show orange badge on row when targetDate is within 6 weeks

### Objective urgency logic (shared utility `objectiveUrgency.ts`)

```ts
type UrgencyStatus = 'overdue' | 'critical' | 'normal'

function getObjectiveUrgency(targetDate: string | null): UrgencyStatus {
  if (!targetDate) return 'normal'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(targetDate + 'T00:00:00')
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 42) return 'critical'
  return 'normal'
}
```

### Inline edit pattern (ReasonForStudying)

```tsx
// In StudentProfileTab
const [editingReason, setEditingReason] = useState(false)
const [reasonDraft, setReasonDraft] = useState(student.reasonForStudying ?? '')
// On save: call onSaveReasonForStudying(reasonDraft)
// On cancel: reset draft to student.reasonForStudying, close edit
```

The save callback is wired in `StudentDetail.tsx` as a `useMutation` that calls `updateStudent` with the full student + new value (same pattern as difficulty toggle).

### Inline edit pattern (Interests)

```tsx
// In StudentProfileTab
const [editingInterests, setEditingInterests] = useState(false)
const [interestsDraft, setInterestsDraft] = useState(student.interests)
// Simple tag add/remove UI; on save: call onSaveInterests(interestsDraft)
```

## File list

| File | Change |
|------|--------|
| `frontend/src/components/student/StudentProfileTab.tsx` | Major: add hero section, inline edits, urgency on objectives, bullet list goals, interests section |
| `frontend/src/components/student/StudentProfileTab.test.tsx` | Update: add tests for hero, urgency, inline edit, interests section |
| `frontend/src/components/student/StudentOverviewTab.tsx` | New: Primary Objective card + TeachingTodos + Followups |
| `frontend/src/components/student/StudentOverviewTab.test.tsx` | New |
| `frontend/src/lib/objectiveUrgency.ts` | New: urgency logic utility |
| `frontend/src/lib/objectiveUrgency.test.ts` | New |
| `frontend/src/pages/StudentDetail.tsx` | Add overview tab, add mutation callbacks |
| `frontend/src/pages/StudentDetail.test.tsx` | Update: add overview tab test |
| `frontend/src/pages/StudentForm.tsx` | Add reasonForStudying + shortTermObjectives states + form fields |
| `frontend/src/pages/StudentForm.test.tsx` | Update: add tests for new fields |
| `e2e/tests/students.spec.ts` | Add e2e happy path for new fields round-trip |

## E2E happy path

Test scenario: create a student with ReasonForStudying and a short-term objective, navigate to student detail, verify overview tab shows objective with days remaining, verify profile tab shows hero quote and interests.

## Decisions

- **Overview tab scope**: Add minimal Overview tab with Primary Objective card + Teaching Todos + Pending Followups. Session history preview and Pedagogical Profile card are future tasks.
- **Inline edit save**: Full `updateStudent` call with all fields (same pattern as difficulty status toggle). No partial update endpoint.
- **Date picker**: Native `<input type="date">`. No date picker component needed.
- **Teaching Goals card in form**: Keep LearningGoals in "Teaching Context" card, add new "Teaching Goals" card for ShortTermObjectives only. The issue maps LearningGoals to the "Teaching Goals > Learning Goals" section, but since it already exists in Teaching Context with a working UI, we only add the missing ShortTermObjectives section to avoid breaking existing functionality.
- **Interests editable section**: Pencil button opens edit mode; shows add input + tags with X remove. Save calls `onSaveInterests`. No separate modal.

## Implementation order

1. `objectiveUrgency.ts` + test (10 min)
2. `StudentOverviewTab.tsx` + test (20 min)
3. `StudentDetail.tsx` -- add overview tab + callbacks (15 min)
4. `StudentProfileTab.tsx` -- hero section, interests section, goals bullet list, objectives urgency (45 min)
5. `StudentProfileTab.test.tsx` -- update tests (20 min)
6. `StudentForm.tsx` -- add fields + states (25 min)
7. `StudentForm.test.tsx` -- update tests (15 min)
8. `e2e/tests/students.spec.ts` -- add happy path (15 min)
