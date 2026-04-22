# Task 720: Student Detail Overview Tab Polish

**Issue:** #720 — polish: Student Detail Overview tab no-scroll layout and card refinements
**Sprint branch:** `sprint/ui-redesign-student-polish`
**Stitch ref:** `plan/langteach-beta/stitch-design-system/student-detail/1. overview/`

## Scope

All changes are in the frontend. No backend changes needed. PrimaryObjectiveCard removal from Overview is scoped to #719 (dependency); this task does not touch it.

## Files to change

- `frontend/src/components/student/StudentOverviewTab.tsx` — main work
- `frontend/src/components/student/TeachingTodosCard.tsx` — add `showAddForm` prop
- `frontend/src/components/student/StudentFollowupsCard.tsx` — add `emptyPrompt` prop for rotating prompt
- `frontend/src/components/student/StudentOverviewTab.test.tsx` — update/add tests
- `frontend/src/components/student/TeachingTodosCard.test.tsx` — add tests for controlled `showAddForm` mode

## Change list

### 1. Card order reorder

Current grid order: Ideas, Followups, Profile  
New order: Followups (1st), Profile (2nd), Ideas (3rd)

In `StudentOverviewTab` JSX, reorder the three `<div>` children inside the `grid grid-cols-1 lg:grid-cols-3` wrapper.

### 2. Conditional amber on Followups card

The wrapper div for the Followups card currently always has `bg-[#FFF9F2] border-l-4 border-[#FFDBCC]`.

Compute `pendingFollowupsCount = followups.filter(f => f.status === 'pending').length` in the component body.

When `pendingFollowupsCount > 0`: amber tonal (`bg-[#FFF9F2]`).  
When 0: neutral white (`bg-white`).  
Remove the `border-l-4 border-[#FFDBCC]` border (violates the no-line rule).

### 3. Conditional Ideas card

Compute `pendingTodosCount = student.teachingTodos.filter(t => t.status === 'Pending').length`.

When `pendingTodosCount > 0`: white card with shadow (current style).  
When 0: muted `bg-[#F4F2FD]` background (quieter surface-container-low).

### 4. TeachingTodosCard: move + to card header

Add optional prop `showAddForm?: boolean` and `onAddFormClose?: () => void` to `TeachingTodosCard`.

Behavior when `showAddForm` prop is provided (controlled mode):
- Hide the default bottom input row (only render it when `showAddForm === true`)
- When `showAddForm=true`, auto-focus the input
- After a successful add (`onSuccess`), call `onAddFormClose?.()`
- After pressing Escape or blur-without-text, call `onAddFormClose?.()`

Behavior when `showAddForm` prop is undefined (default mode — unchanged, backward compatible):
- Show the bottom input row as before

In `StudentOverviewTab`, add `const [showIdeasAdd, setShowIdeasAdd] = useState(false)`.

In the Ideas card header: `<SectionHeader>Ideas para Clases</SectionHeader>` becomes a flex row with a `+` icon button (indigo, rounded, `h-5 w-5`, `Plus` from lucide-react) on the right. Clicking sets `showIdeasAdd(true)`.

Pass `showAddForm={showIdeasAdd}` and `onAddFormClose={() => setShowIdeasAdd(false)}` to `TeachingTodosCard`.

Remove the big green + button from the outer wrapper (there isn't one currently — the + is inside `TeachingTodosCard`'s input row). The input row is the bottom `<div className="flex gap-2">` in `TeachingTodosCard`.

### 5. PedagogicalProfileCard enhancements

**a. Language tags with prefixes (L-/T-):**

Currently: native language tags only, e.g. `English`. Change to `L-ENGLISH` prefix.  
Add target language: `T-{student.learningLanguage.toUpperCase()}` tag at the bottom.  
Both native and target appear in the same tag row.  
Remove the `nativeLanguages.length > 0` guard entirely. The tag row now always renders because target language is always set.

**b. Empty-state (no skill overrides): show goals + active difficulties.**

When `entries.length === 0`:
- Show up to 2 active difficulties (filter `d.status === 'Active'`) as compact lines: `"Working on: {d.description}"`
- If no difficulties, show up to 2 learning goals: `"{goal.text}"`
- If neither: show the rotating empty-state prompt (see change 6)

**c. With skill overrides: add difficulties summary.**

After skill bars, if active difficulties exist, add a compact section: label "Working on:" followed by up to 2 difficulty descriptions joined with " · ".

### 6. Rotating empty-state prompts

Add a `rotatingPrompt(studentId: string, prompts: string[]): string` helper in `StudentOverviewTab.tsx`:

```ts
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h
}

function rotatingPrompt(studentId: string, prompts: string[]): string {
  const today = new Date().toISOString().slice(0, 10)
  return prompts[Math.abs(hashCode(studentId + today)) % prompts.length]
}
```

Prompt lists (studentName resolved at call site, using `student.name.split(' ')[0]`):

**Pedagogical Profile (empty, no overrides AND no difficulties AND no goals):**
- "What does {name} struggle with most?"
- "Which skill needs most work: speaking, writing, reading, or listening?"
- "Any grammar points {name} keeps getting wrong?"
- "{name}'s weakest area right now?"

**Ideas para Clases (empty, no todos):**
- "Any topic {name} would enjoy practising?"
- "What activity worked well last time?"
- "A grammar point you've been meaning to cover?"

**Pending Followups (empty, no followups at all):**  
The empty-state for Followups lives inside `StudentFollowupsCard.tsx`. Add an optional `emptyPrompt?: string` prop to `StudentFollowupsCard`. When provided, replace the current "No pending followups" text with the prompt text. The parent (`StudentOverviewTab`) computes and passes the rotating prompt.

Prompt list for followups:
- "Anything you promised {name} for next class?"
- "Any materials to prepare before the next session?"

Note: Primary Objective empty prompt is scoped to #719 (not this issue).

### 7. Compact session cards (RecentSessions)

Change `slice(0, 3)` to `slice(0, 2)`.

Replace the current session card (~130px with narrative) with a compact card (~80px):

Layout: horizontal flex row, ~80px total height, `py-3 px-4`.

Left: `CalendarBlock` — two-line block:
  - Day number large (e.g. "14")
  - Month abbreviation small (e.g. "APR")
  - Background: indigo-50 for most recent, zinc-50 for others
  - Fixed width ~44px

Center: vertical stack
  - Row 1: title (truncated to 1 line, font-bold text-sm) + status badge on right
  - Row 2: homework chip when present (warm amber/tertiary chip with icon), OR nothing

Right: duration badge (`{n}min`)

**Title synthesis:** Remove the existing `getSessionTitle` function and replace with `getDisplayTitle(session: SessionLog): string`:
```ts
function getDisplayTitle(session: SessionLog): string {
  if (session.title && session.title !== 'Session') return session.title
  const fallback = session.actualContent || session.generalNotes || session.plannedContent
  if (fallback) return fallback.slice(0, 55) + (fallback.length > 55 ? '...' : '')
  return 'Session'
}
```

**Homework chip:** If `session.homeworkAssigned`, render a small chip:
- Icon: `BookOpen` (lucide), h-3 w-3
- Text: `session.homeworkAssigned` truncated to 40 chars
- Style: `bg-amber-50 text-[#7E3000] rounded-full px-2 py-0.5 text-[10px] font-semibold`

Remove narrative paragraph entirely from compact view.

### 8. Test updates

**`StudentOverviewTab.test.tsx`** — tests that will break and need updating:

- **"limits to 3 sessions"**: Update to expect 2 sessions.
- **"shows session narrative snippet"**: Remove (narrative no longer shown in compact view).
- **Empty-state tests for Followups card background**: Add test that amber background appears only when pending followups exist (neutral otherwise).
- **Card order test**: Add test checking Followups renders before Profile in the grid (use `getAllByTestId` or container query order).
- **Rotating prompt tests**: Verify rotating prompt appears for empty Pedagogical Profile (no overrides, no difficulties, no goals).
- **Title synthesis test**: Verify blank/generic title falls back to narrative excerpt.
- **Language tags**: Update "renders native language tags" to also verify target language tag ("T-SPANISH"). Update "does not render native language tags when empty" — tag row now always renders (has target language).
- Keep all other existing tests.

**`TeachingTodosCard.test.tsx`** — new tests for `showAddForm` controlled mode:

- **controlled mode - add input hidden by default**: When `showAddForm=false`, the add input row is not rendered.
- **controlled mode - add input visible when showAddForm=true**: The input is rendered when `showAddForm=true`.
- **controlled mode - onAddFormClose called after successful add**: After adding text and submitting, `onAddFormClose` is called.
- **backward compat - default mode unchanged**: When `showAddForm` prop is omitted, the add input row always renders.

## e2e coverage

Create new Playwright test file `frontend/e2e/student-detail.spec.ts` (does not exist yet) to:
- Navigate to a student's Overview tab
- Assert that the three-card row is in order: Followups, Profile, Ideas
- Assert compact session card renders (not narrative paragraph)
- Assert "View all sessions" link is visible

## Not in scope

- PrimaryObjectiveCard removal (covered by #719)
- SessionHistoryTab changes
- Any backend/API changes
- URL tab state (#719)
