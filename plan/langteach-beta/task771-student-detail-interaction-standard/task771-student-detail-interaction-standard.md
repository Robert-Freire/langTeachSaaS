# Task 771 — Student Detail: Interaction Standard

**Issue:** #771  
**Branch:** worktree-task-t771-student-detail-interaction-standard  
**Sprint:** sprint/ui-redesign-student-polish

---

## Objective

Implement the interaction standard (autosave, inline session edit, profile polish) across the student detail screen. Seven discrete changes to two files plus one new component.

---

## Code Audit Findings

### Files to change

| File | Change |
|------|--------|
| `frontend/src/components/ui/SavedIndicator.tsx` | CREATE new component |
| `frontend/src/components/student/StudentProfileTab.tsx` | Motivation autosave, Interests always-edit, TWM position, label rename |
| `frontend/src/pages/StudentDetail.tsx` | Edit Student button styling |
| `frontend/src/components/session/SessionHistoryTab.tsx` | Remove kebab, inline editable fields, delete in expanded state |
| `frontend/src/api/sessionLogs.ts` | Add `title` to `CreateSessionLogRequest` (missing field) |
| `e2e/tests/student-detail.spec.ts` | New e2e tests for motivation autosave, interests, session inline edit |
| `e2e/tests/visual/student-detail.visual.spec.ts` | Add profile tab screenshot + expanded session screenshot |

### Infrastructure findings

1. **`title` missing from frontend request type**: `CreateSessionLogRequest` does not include `title`, but the backend `UpdateSessionLogDto` does accept `Title`. Must add `title?: string | null` to the frontend type before inline session title editing can work.

2. **No PATCH endpoint for sessions**: Backend only has PUT at `api/students/{studentId}/sessions/{sessionId}` requiring the full payload. The inline session edit will call `updateSession` (PUT) with the full payload, merging the changed field into the current session state. This matches how `saveReasonForStudying` works for students. The intent (save the field) is achieved without corrupting data.

3. **`previousHomeworkStatus` is required in `UpdateSessionLogRequest`**: The frontend `SessionLog` type exposes `previousHomeworkStatusName` (string) and `previousHomeworkStatus` (number). When building a PUT payload from a session, use `previousHomeworkStatusName` for the `previousHomeworkStatus` field in the request.

---

## Implementation Steps

### Step 1 — `SavedIndicator` component

**File:** `frontend/src/components/ui/SavedIndicator.tsx`

```tsx
// Props: visible: boolean
// Renders: Lucide Check (h-3 w-3) + "Saved" text
// Classes: text-xs text-zinc-400 flex items-center gap-1
// Animation: fade in 200ms ease-out on visible=true, hold 1000ms, fade out 300ms
// useEffect + setTimeout for auto-hide; reset immediately when visible goes false externally
```

Use CSS transitions with opacity and `pointer-events-none` when hidden. The parent passes `visible` and the component manages its own hide timer internally via `useEffect`.

---

### Step 2 — Motivation banner autosave

**File:** `frontend/src/components/student/StudentProfileTab.tsx`, `MotivationHero` component (lines 237-379)

**Changes to `MotivationHero`:**
- Remove `saving` state and the Save + Cancel buttons entirely.
- Add `savedVisible` state (boolean) for `SavedIndicator`.
- Add `saveError` state (string | null) for error display.
- On `onBlur` of the textarea: call `onSave(draft.trim())`. If success: set `savedVisible = true` (auto-hides via component). If error: show `text-xs text-red-500` "Failed to save" inline in banner header (top right area), auto-hide after 3s.
- Pencil icon is already present on hover (`opacity-0 group-hover:opacity-100`). Keep it.
- On textarea render: add `onKeyDown` for `Escape` key: revert `draft` to `student.reasonForStudying ?? ''` and `inputRef.current?.blur()` (no save).
- Add `savedVisible` and `saveError` rendering in banner header top-right.
- No debounce — fires on blur only.

---

### Step 3 — Interests section always-editable

**File:** `frontend/src/components/student/StudentProfileTab.tsx`, `InterestsSection` component (lines 384-544)

**Redesign `InterestsSection`:**
- Remove `editing` state, `editing ? ...` conditional rendering, Save button, Cancel button, pencil icon, and plus icon from the header.
- Always render the chip input below the existing chips.
- Local `chips` state initialized from `student.interests` (sync when student prop changes via `useEffect`).
- `savedVisible` state (boolean) for `SavedIndicator` in section header.
- `saveError` state (string | null).
- **Add chip:** type + Enter or comma. Append to `chips`. Call `onSave(updatedChips)`. On success: show `SavedIndicator`. On error: revert chip, show error.
- **Remove chip:** click ×. Remove from `chips`. Call `onSave(updatedChips)`. On success: show `SavedIndicator`. On error: re-add chip, show error.
- Do NOT save on every keystroke — only on Enter/comma (add) or × (remove).
- Placeholder: "Add interest..."
- Input is always visible at the bottom of the chip list.

---

### Step 4 — TWM unconditional in right sidebar

**File:** `frontend/src/components/student/StudentProfileTab.tsx`, right column section (lines 902-1026)

**Current problem:** TWM (`profile-about` section) is conditionally rendered behind `(hasAbout || showEmptySections)`. The `showEmptySections` state is also controlled by the "Show all sections" toggle in the left column (via the `anySectionCollapsed` guard).

**Changes:**
- Move the TWM section (currently at position 1 in right column, lines 907-929) to render **unconditionally** at the top of the right column, outside any condition.
- `showEmptySections` and "Show all sections" button must only control left column sections. To achieve this: the TWM section in the right sidebar must NOT be gated on `showEmptySections`.
- Right sidebar order (top to bottom): Teacher's Working Memory (unconditional) → Language Ecosystem → Interests → Commercial → Ideas para Clases → Pending Followups.
- The `hasAbout` and `hasWorkingMemory` booleans can remain for internal logic within the TWM card, but the card itself renders regardless.
- The left column Teacher's Working Memory section (dark card, lines 835-899) is already gated on `(hasWorkingMemory || showEmptySections)` — that is correct and unchanged.

---

### Step 5 — Rename "Teaching Todos" to "IDEAS PARA CLASES"

**File:** `frontend/src/components/student/StudentProfileTab.tsx`

Line 1010: Change `<SectionHeader>Teaching Todos</SectionHeader>` to `<SectionHeader>Ideas para Clases</SectionHeader>`.

The `data-testid="profile-teaching-todos"` attribute stays as-is.

---

### Step 6 — Edit Student button Secondary variant

**File:** `frontend/src/pages/StudentDetail.tsx` (lines 422-427)

The Edit Student link currently uses `className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium bg-[#E8E7F1] text-[#3525CD] hover:bg-[#DDD9F5] transition-colors"`. This already uses a light indigo background and indigo text. Looking at the design-system Section 5 Secondary: `bg-indigo-50`, `text-indigo-600`, no border.

Update to match Secondary variant exactly:
- `bg-indigo-50` (instead of `#E8E7F1`)
- `text-indigo-600` (instead of `#3525CD`)
- `hover:bg-indigo-100`
- No border, same height and padding as Log Session button.

---

### Step 7 — Sessions tab: remove kebab, inline editable fields, delete in expanded state

**File:** `frontend/src/components/session/SessionHistoryTab.tsx`

**7a. Add `patchSession` helper to `sessionLogs.ts`:**

Rather than duplicating the full payload build everywhere, add a helper in `sessionLogs.ts`:

```typescript
export async function patchSessionField(
  studentId: string,
  session: SessionLog,
  patch: Partial<Pick<CreateSessionLogRequest, 'title' | 'actualContent' | 'duration' | 'nextSessionTopics'>>,
): Promise<SessionLog> {
  const payload: UpdateSessionLogRequest = {
    sessionDate: session.sessionDate,
    plannedContent: session.plannedContent,
    actualContent: session.actualContent,
    homeworkAssigned: session.homeworkAssigned,
    previousHomeworkStatus: session.previousHomeworkStatusName,
    nextSessionTopics: session.nextSessionTopics,
    generalNotes: session.generalNotes,
    levelReassessmentSkill: session.levelReassessmentSkill,
    levelReassessmentLevel: session.levelReassessmentLevel,
    linkedLessonId: session.linkedLessonId,
    topicTags: session.topicTags,
    isCancelled: session.isCancelled,
    status: session.statusName,
    duration: session.duration,
    title: session.title,
    ...patch,
  }
  return updateSession(studentId, session.id, payload)
}
```

**7b. Remove kebab from `SessionEntry`:**
- Remove the kebab `<div>` (lines 252-293) entirely.
- Remove `kebabOpen` state, `Popover`, `PopoverTrigger`, `PopoverContent`, `onEdit` prop reference.
- Remove `MoreHorizontal` import.
- Remove `onEdit` from `SessionEntry` props and from `SessionHistoryTab`'s call site.
- Remove `handleEdit` function from `SessionHistoryTab` (line 483-485). Also remove navigation import if only used for that.

**7c. Inline editable fields in expanded state:**

When `expanded = true`, replace static text with editable inputs for:

| Field display | Element | API field in patch |
|---|---|---|
| Title (`getSessionTitle(session)` in header) | `<input type="text">` | `title` |
| Session Narrative (`session.actualContent`) | `<textarea>` auto-resize | `actualContent` |
| Duration (number + "min") | `<input type="number" min="0">` + "min" label | `duration` |
| Next class plan (`session.nextSessionTopics`) | `<textarea>` auto-resize | `nextSessionTopics` |

Each field:
- Tracked in local state initialized from `session` prop values (title: `session.title ?? ''`, narrative: `session.actualContent ?? ''`, etc.)
- On `onBlur`: if value changed, call `patchSessionField(studentId, session, { [field]: value })`. Show `SavedIndicator` in row header on success, `text-xs text-red-500` "Failed to save" auto-hide 3s on error.
- `Escape` key: revert to saved value, blur (no save).
- `savedVisible` state and `saveError` state in `SessionEntry`.

The title input replaces the `<h3>` in the collapsed header too - wait, no. The issue says the title input appears "when a row is expanded." In collapsed state, the title still renders as `<h3>`. In expanded state, the title in the collapsed header area becomes an `<input>`. Actually re-reading: "When a row is expanded, the following fields become editable inputs instead of static text." So when expanded, the `<h3>` in the header becomes an input. Simplest approach: keep the `<h3>` logic for collapsed, add the `<input>` for title in the expanded area (not in the header row), similar to the other fields.

Actually the issue says "Session title | `<span>` heading text | `<input type="text">` | `title`" - I'll put the title input at the top of the expanded detail section.

**7d. Delete in expanded state:**

In the expanded detail section, add at the bottom:
- A ghost button with `Trash2` icon + "Delete session" text, `text-red-600`, styled as ghost.
- On click: open the existing `AlertDialog`. This replaces the kebab Delete action.
- Keep existing `AlertDialog` logic intact.

---

### Step 8 — Add `title` to `CreateSessionLogRequest`

**File:** `frontend/src/api/sessionLogs.ts`

Add `title?: string | null` to `CreateSessionLogRequest`.

---

### Step 9 — Unit tests

**Files:**
- `frontend/src/components/ui/SavedIndicator.test.tsx` (new)
- `frontend/src/components/student/StudentProfileTab.test.tsx` (existing, add cases)

**SavedIndicator tests:**
- Renders nothing (opacity-0 / pointer-events-none) when `visible=false`.
- Shows check icon and "Saved" text when `visible=true`.
- Auto-hides after ~1500ms (use fake timers).

**MotivationHero tests (in StudentProfileTab.test.tsx):**
- Blur on textarea calls `onSave` with trimmed value.
- Escape key reverts textarea value and does NOT call `onSave`.
- `SavedIndicator` appears after successful save (mock `onSave` resolving).
- Error message appears when `onSave` rejects.

**InterestsSection tests (in StudentProfileTab.test.tsx):**
- Chip input is always visible without any user interaction.
- Enter key adds chip and calls `onSave` with updated array.
- Comma key adds chip and calls `onSave`.
- × on chip removes it and calls `onSave`.
- Does NOT call `onSave` on each keystroke.

---

### Step 10 — E2E tests

**File:** `e2e/tests/student-detail.spec.ts` — add tests:

1. **Motivation autosave:** navigate to Ana Seed (has `reasonForStudying`), go to Profile tab, click motivation text to open textarea, change value, blur (tab away), verify `SavedIndicator` appears. Also verify Escape reverts without saving: fill a unique value, press Escape, verify the textarea shows the original value (not the typed value) by checking the DOM, not `page.request`.

2. **Interests always-edit:** go to Profile tab for Ana Seed, verify interests chip input is always visible (no edit button needed), type an interest + Enter, verify chip appears. Click × on a chip, verify it disappears.

3. **TWM always visible:** navigate to a student without notes AND without clicking "Show all sections", verify `profile-about` section is visible immediately.

4. **Session inline edit:** navigate to Diego Seed, go to Sessions tab, click a session row to expand it, verify title input and narrative textarea are visible. Change title, blur, verify `SavedIndicator` appears. Verify Escape reverts.

5. **Session delete in expanded state:** expand a session row, verify "Delete session" button is visible (no kebab needed). Click it, verify confirm dialog appears. Cancel - verify dialog closes. (Do not actually delete in this test to avoid seeder side-effects.)

6. **No kebab:** expand a session row, verify `data-testid="session-kebab-trigger"` does NOT exist.

**File:** `e2e/tests/visual/student-detail.visual.spec.ts` — add tests:

1. Profile tab screenshot with right sidebar visible (TWM showing).
2. Sessions tab with an expanded session row (editable fields visible).

Use `Diego Seed` for session tests (already has sessions in seeder).

---

## Acceptance Criteria Checklist

All ACs from issue #771 covered by the implementation above.

Key notes:
- The `SavedIndicator` holds its own hide timer internally.
- `onSave` props in `StudentProfileTab` already exist (`onSaveReasonForStudying`, `onSaveInterests`) and are wired in `StudentDetail.tsx`.
- For session fields, use `patchSessionField` helper for clean payload building.
- The `previousHomeworkStatus` mapping: use `session.previousHomeworkStatusName` (e.g. "NotApplicable", "Done", etc.). Guard with fallback: `session.previousHomeworkStatusName || 'NotApplicable'` since the field is required in the request type.

---

## Out of Scope

- Overview tab changes
- Edit Student screen (`/students/:id/edit`)
- Sessions tab search bar, filters, TOTAL HOURS stat card
- Underlying data model or API contracts (only `title` field added to request type)
- Edit Student full-page form autosave
