# Task 725: Edit Student Autosave Refactor and Critical Bugs

**Issue:** https://github.com/Robert-Freire/langTeachSaaS/issues/725
**Branch:** `worktree-task-t725-edit-student-autosave`
**Sprint branch:** `sprint/ui-redesign-student-polish`

## Context

The Edit Student form (`frontend/src/pages/StudentForm.tsx`, ~1317 lines) currently runs two save
models simultaneously: sidebar items (TeachingTodos, Followups) autosave via discrete API calls,
while the main form requires a "Save Profile" button click. This causes data loss bugs (users
navigate away with unsaved changes), the Enter-submit problem, and confusing Cancel semantics.

The fix is architectural: convert the main form fields to autosave as well, eliminating the
form-submission model for edit mode. New student creation (`/students/new`) retains the
existing Save button flow.

## Codebase Notes

- `StudentForm.tsx`: uses individual `useState` per field (~20 fields). Single `PUT /api/students/:id`
  endpoint takes full `StudentFormData` - no partial update. `handleSubmit` builds the full payload.
- `MultiSelect` component (`frontend/src/components/ui/multi-select.tsx`): combobox with type-to-search,
  custom values, chip display. Already used by NativeLanguages.
- `LearningGoalTreeEditor`: inline editing with `onBlur` commit - likely source of first-click bugs.
- Language list in `frontend/src/lib/languages.ts`: currently 9-10 languages. Needs expansion to 50+.
- Section nav scrollspy uses scroll event + `getBoundingClientRect().top <= 80` (not IntersectionObserver).
  `SCROLLSPY_IDS` deliberately omits `section-proficiency` (2-column layout, shares Y with section-basic).
- Seed data typo ("travel to sapin") is NOT in any code file - it is live DB data for a real student
  named Nataliya in the teacher's account. Will fix via the edit UI after implementation.

## Files to Modify

1. `frontend/src/pages/StudentForm.tsx` - major refactor
2. `frontend/src/lib/languages.ts` - expand to 50+ languages
3. `frontend/src/components/ui/multi-select.tsx` - add `onDuplicate` callback prop
4. `frontend/src/components/student/LearningGoalTreeEditor.tsx` - first-click bug
5. `frontend/src/pages/StudentForm.test.tsx` - update tests
6. `e2e/tests/students.spec.ts` - remove/update tests that click "Save Profile" in edit mode

## New Files

1. `frontend/src/hooks/useStudentAutosave.ts` - autosave hook (debounce + status)
2. `frontend/src/hooks/useStudentAutosave.test.ts` - unit tests for the hook

## Implementation Steps

### Step 1: Expand language list (`lib/languages.ts`)

Add 50+ ISO 639-1 common languages as a new `ALL_LANGUAGES` constant. This will be used by
the combobox for NativeLanguages, SpokenLanguages, and LearningLanguage:

```ts
export const ALL_LANGUAGES = [
  'Arabic', 'Bengali', 'Bulgarian', 'Catalan', 'Chinese (Simplified)',
  'Chinese (Traditional)', 'Croatian', 'Czech', 'Danish', 'Dutch',
  'English', 'Estonian', 'Finnish', 'French', 'German', 'Greek',
  'Hebrew', 'Hindi', 'Hungarian', 'Indonesian', 'Italian', 'Japanese',
  'Korean', 'Latvian', 'Lithuanian', 'Macedonian', 'Malay', 'Mandarin',
  'Norwegian', 'Persian', 'Polish', 'Portuguese', 'Romanian', 'Russian',
  'Serbian', 'Slovak', 'Slovenian', 'Spanish', 'Swedish', 'Tagalog',
  'Tamil', 'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese',
  ...
]
```

Keep `LANGUAGES` for backward compat (used by lesson/course forms).
Add `ALL_LANGUAGE_OPTIONS` for the combobox.

### Step 2: Create `useStudentAutosave` hook

File: `frontend/src/hooks/useStudentAutosave.ts`

```ts
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function useStudentAutosave(
  studentId: string | undefined,
  getFormData: React.MutableRefObject<() => StudentFormData | null>
): {
  status: SaveStatus
  scheduleTextSave: () => void   // 400ms debounce
  saveNow: () => void            // immediate (dropdowns, toggles)
}
```

Implementation:
- Use `useRef<number | null>` for debounce timer
- `scheduleTextSave`: clears existing timer, sets 400ms timeout -> calls `doSave()`
- `saveNow`: clears timer, calls `doSave()` immediately
- `doSave`: calls `getFormData.current()`, returns early if null (name empty); calls
  `updateStudent(studentId, data)`; sets status `saving` -> `saved` -> (after 2s) `idle`
- On error: sets status `error`, schedules retry after 3s (max 3 retries)
- On unmount: clear timer

The `getFormData` ref avoids stale closure problems - it always reads current field state.

### Step 3: Autosave refactor in `StudentForm.tsx` (edit mode only)

**3a. Add `formDataRef`** - a `useRef` holding a function that builds `StudentFormData` from
current state. Update via a `useEffect([...all 20 fields])` that runs after every render where
any field changes - this ensures the ref always reflects committed state when `doSave` fires:

```ts
const formDataRef = useRef<(() => StudentFormData | null) | null>(null)
useEffect(() => {
  formDataRef.current = () => {
    if (!name.trim() || !language) return null  // required fields missing
    return buildFormData()  // builds from current state values
  }
}, [name, language, cefrLevel, ...allOtherFields])
```

**3b. Wire the hook:**
```ts
const { status, scheduleTextSave, saveNow } = useStudentAutosave(
  isEdit ? id : undefined,
  formDataRef
)
```

**3c. Sticky header changes (edit mode only):**
- Remove `<Button type="submit" form="student-form">Save Profile</Button>`
- Remove `<Button ... onClick={() => navigate('/students')}>Cancel</Button>`
- Add status indicator (left of Done button):
  - `idle/saved`: "All changes saved" with CheckCircle icon (fades after saved -> idle)
  - `saving`: "Saving..." with Loader2 spinner
  - `error`: "Couldn't save, retrying..." in red
- Add `<Button type="button" onClick={() => navigate(`/students/${id}`)}>Done</Button>`

**3d. Remove `<form>` submit semantics in edit mode:**
- In edit mode, the `<form id="student-form">` wrapper remains but `onSubmit` is a no-op
  (or remove the form wrapper entirely for edit mode, keeping it only for new student)
- Remove `type="submit" form="student-form"` references in edit mode

**3e. Wire field changes to autosave:**

Text fields (debounced, 400ms):
- name, birthYear, profession, countryOfOrigin, cityOfOrigin, countryOfResidence,
  cityOfResidence, reasonForStudying, personalNotes, teachingNotes, rate

Immediate fields (save on change):
- language (Select onChange)
- cefrLevel (Select onChange)
- officialCefrLevel (Select onChange)
- isActive, isCorporate (toggle onClick)
- nativeLanguages (MultiSelect onChange)
- spokenLanguages (MultiSelect onChange - new component)
- skillLevelOverrides (Select onChange per skill)
- interests (on add/remove chip - after interest is committed)
- learningGoals (LearningGoalTreeEditor onChange - call `saveNow()` in its `onChange` callback)
- weaknesses (on add/update/remove - call `saveNow()` in updateWeakness/removeWeakness/addWeakness)
- difficulties (on add/update/remove - call `saveNow()` in updateDifficulty/removeDifficulty)
- shortTermObjectives (on add/update/remove - call `saveNow()` in updateObjective/removeObjective)

For text fields: call `scheduleTextSave()` in the existing `onChange` handler.
For immediate fields: call `saveNow()` in the existing `onValueChange`/`onClick`.

**3f. Per-field required validation (name and language):**
- If `name.trim() === ''`: show inline "Name is required" error, `formDataRef.current()` returns null (blocks save). 
  Show error in status indicator as "Fix required fields to save" in amber/red.
- If `language` is cleared: show inline "Language is required" error, same null return from formDataRef.
- Once required fields are filled: clear error, restore normal save flow.
- Implementation: existing `errors` state already handles per-field errors. Reuse it.
  Show validation errors immediately on field change (not just on blur).

**3g. `isEdit && !isActive` badge:** keep as-is.

**3h. New student flow:** unchanged - keep form, Save/Cancel buttons, validate-then-submit.

### Step 4: Tab navigation bugs

**Bug 1: Proficiency tab "navigates away"**
Root cause: The sticky header contains `<Button type="submit" form="student-form">`. After
the autosave refactor removes this button, the navigation-on-submit is eliminated. No additional
fix needed if refactor is complete. If still reproducible, add `onSubmit={(e) => e.preventDefault()}`
to the form element.

**Bug 2: Notes tab active indicator wrong**
The scrollspy sets `current` to the last section in `SCROLLSPY_IDS` where `top <= 80`.
The issue is likely that `section-notes` and `section-commercial` are both "above the fold"
when the user has scrolled to Notes, so `section-commercial` could be active.

Fix: Use a more precise active-section algorithm. Instead of "last section with top <= 80",
use "section whose top is closest to 80 from above". Or: add special handling for the last
section (section-commercial) - if the user is near the bottom of the page, activate it.
Also ensure `activeSection` resets to the clicked section immediately on click (before scroll
settles), not just via the scroll event.

**Bug 3: Commercial scroll target wrong**
`scrollToSection('section-commercial')` should find `<div id="section-commercial">` and scroll
to it. The `section-commercial` div is at line ~1188. If it's inside the `{isEdit && ...}` guard,
the scroll calculation might be off due to the element not being at the expected position.
Debug: verify `document.getElementById('section-commercial')` returns the correct element.
The scroll overshoots to Difficulties (section above) - likely the `getBoundingClientRect` offset
calculation is wrong. Fix by adding a small offset adjustment or scrolling with `block: 'start'`.

**Bug 4: Multiple active tabs**
Current algorithm always accumulates ("last with top <= 80 wins"). When the user scrolls to
Notes, section-difficulties and section-teaching-goals might both have `top <= 80`. The algo
picks the last one - which should be `section-notes`. If the bug is that `section-notes` IS
last and IS being set as active but the tab doesn't highlight, check whether `FORM_SECTIONS`
and `SCROLLSPY_IDS` are both referencing the same id values.

Actual fix: after each click on a section nav button, immediately `setActiveSection(s.id)` to
give instant visual feedback, then let the scroll event take over:
```tsx
onClick={() => { setActiveSection(s.id); scrollToSection(s.id) }}
```
This resolves the perceived "wrong active tab" UX.

### Step 5: Language combobox expansion

**Native Languages:** Already uses `MultiSelect`. Update:
- Pass `ALL_LANGUAGE_OPTIONS` instead of `NATIVE_LANGUAGE_OPTIONS`
- `allowCustom={true}` (enable custom entries)
- Keep `maxItems={5}`

**Spoken Languages:** Replace the raw text input (lines 648-684) with `MultiSelect`:
- `options={ALL_LANGUAGE_OPTIONS}`
- `selected={spokenLanguages}`
- `onChange={(vals) => { setSpokenLanguages(vals); saveNow() }}`
- `allowCustom={true}`
- Remove `spokenInput`, `spokenInputRef`, `addSpokenLanguage`, `handleSpokenKeyDown` state/functions
- Wire removal chips to `saveNow()` (already handled via onChange)

**Learning Language:** Replace `<Select>` with a single-value combobox using `MultiSelect`
with `maxItems={1}`:
- `options={ALL_LANGUAGE_OPTIONS}`
- `selected={language ? [language] : []}`
- `onChange={(vals) => { if (vals[0]) setLanguage(vals[0]); saveNow() }}`
- `allowCustom={true}`
- Remove "Other" special casing since all languages are searchable

**Duplicate feedback:** `MultiSelect` silently ignores duplicates (already). Add inline message:
when a duplicate is attempted (value already in selected), show a brief toast/inline message
"Already added". This requires a small change to `MultiSelect` component - add an `onDuplicate`
callback prop.

### Step 6: Navigation consistency

**PageHeader backTo (edit mode):**
Currently: `backTo="/students"`, `backLabel="Students"`
Change: `backTo={isEdit && id ? `/students/${id}` : '/students'}` and
`backLabel={isEdit && existing?.name ? existing.name : 'Students'}`

This changes the breadcrumb from `< Students` to `< {Student Name}` in edit mode.

**Done button:** Already handled in Step 3c - navigates to `/students/${id}`.

**Cancel in new student mode:** keep navigating to `/students` (unchanged).

### Step 7: `LearningGoalTreeEditor` first-click bugs

**Root cause:** When the user has focus on another element (e.g., an editing goal input),
clicking "Add goal" or "+" first triggers `onBlur` on the current input, which calls
`commitEdit()`/`setAddingChild(false)` - causing a re-render. In React 18, the click event
on the button may then be lost because the button's DOM position shifted.

**Fix:** Use `onMouseDown` + `e.preventDefault()` on the "Add goal" and "+" buttons to prevent
the focused element from firing blur before the click. Or: delay the blur handling:

```tsx
// In GoalRow "+" button:
onMouseDown={(e) => e.preventDefault()}  // prevent blur on current input
onClick={() => { setAddingChild(true); setExpanded(true) }}

// In LearningGoalTreeEditor "Add goal" button:
onMouseDown={(e) => e.preventDefault()}
onClick={() => setAddingTop(true)}
```

### Step 8: Network error handling

Sonner is NOT available in this project. Use inline status indicator in the sticky header
(already planned in Step 3c) for error feedback. No new toast dependency needed.

Error states in status indicator:
- `error`: show "Couldn't save, retrying..." in red with a RefreshCw icon
- After 3 successful retries fail: show "Save failed - check connection" with a retry button

The `useStudentAutosave` hook handles retry logic (max 3 retries, 3s delay between attempts).

### Step 9: Tests

**Unit tests (`StudentForm.test.tsx`):**
- Keep "renders Save and Cancel buttons in header for new student" (new student mode unchanged)
- Add: "Done button navigates to /students/:id in edit mode"
- Add: "edit mode does NOT render Save Profile button"
- Add: "status indicator renders in edit mode"
- Add: "Cancel navigates to /students in new student mode" (keep existing test)
- Update: breadcrumb test - edit mode backTo is `/students/:id`, backLabel is student name
- Keep all new-student-mode form tests (unchanged path)

**Unit tests for `useStudentAutosave`:**
File: `frontend/src/hooks/useStudentAutosave.test.ts`
- debounced save fires after 400ms
- immediate save fires synchronously
- status transitions: idle -> saving -> saved -> idle
- error case: status transitions to error, retry fires after 3s
- does not save when getFormData returns null (name empty)

**Unit tests for `LearningGoalTreeEditor.test.tsx`:**
- "Add goal" button opens input on first click (regression test for double-click bug)
- "+" sub-goal button opens child input on first click

**E2E - update `e2e/tests/students.spec.ts`:**
- Audit for all tests that `click('Save Profile')` in edit mode - there are at least 3 (around
  lines 232, 255, 970). Replace with waiting for "All changes saved" status indicator instead.
- Tests that navigate away after a save: replace "click Save Profile, wait for navigation" with
  "change a field, wait for 'All changes saved' indicator, then click Done"

**E2E - happy path for autosave (new test or in students.spec.ts):**
1. Navigate to existing student's edit page (use student from seeded data)
2. Change the Profession field text
3. Wait 500ms (debounce + save round trip)
4. Assert `[data-testid="autosave-status"]` shows "All changes saved"
5. Click "Done" button, verify navigation to `/students/:id`
6. Reload the edit page, verify profession change persisted

Also test: immediate save after dropdown change (CEFR level).

## Out of Scope

- "travel to sapin" seed data typo: live DB data only (not in any code file). Fix manually
  via the edit UI after implementation. Not a code change.
- Stitch visual alignment (issue #726): separate issue
- Teaching Goals structure, Short-Term Objectives competency tagging: Phase 2

## Risk Notes

- `formDataRef` pattern must handle the async React state update timing: the ref should be
  updated synchronously in each field's setter. Use a `useEffect` to keep the ref up-to-date,
  or update it inline in each `onChange` handler.
- The Learning Language field has required validation on the backend. If the user clears it
  via the combobox (removes the only chip), treat it like the name validation: block the save
  and show an error.
- The "new student" form flow uses `<form id="student-form" onSubmit={handleSubmit}>` with a
  Submit button. Ensure the refactor doesn't accidentally remove or break this path.
  Safeguard: wrap all autosave logic in `if (isEdit)` guards.
- Existing e2e tests (students-edit.visual.spec.ts) look for `<form>` visibility. If the form
  element is removed in edit mode, update the test to check for a different landmark.
