# Task 726: Edit Student — Stitch Visual Alignment

**Issue:** #726  
**Branch:** worktree-task-t726-edit-student-stitch-alignment  
**Depends on:** #725 (autosave refactor, expected to land first)

## Context

The Edit Student form is functionally sound but visually diverges from the Stitch Academic Atelier design. This task addresses 7 specific design gaps identified by Vera against the Stitch mockup at `plan/langteach-beta/stitch-design-system/students-edit/`.

**Key constraint:** Issue #725 (autosave refactor + language combobox) is still in-flight. This task works on the current `StudentForm.tsx`. When #725 merges, there will be conflicts in:
- Language fields (Native/Spoken/Learning) — #725 refactors all three to comboboxes
- Header area (Save/Cancel removed, sticky header changed)

The plan accounts for this by keeping language chip changes minimal and compatible with the incoming #725 combobox output.

---

## Acceptance Criteria and Implementation Plan

### AC1: CEFR badge styling (dropdowns render as badges at rest)

**Affected fields:** Teacher's Assessment (`cefrLevel`), Official Level (`officialCefrLevel`), Skill Overrides (4 skills)

**Current state:** All rendered as plain `<Select>` dropdowns.  
**Target state:** Resting = `CefrBadge` component; click badge to switch to dropdown for editing.

**Implementation:**
- Add local state `editingCefrField: string | null` to `StudentForm` to track which CEFR field is open for editing.
- Create a small inline `CefrDropdownField` pattern:
  - If value is set AND field is not being edited: render `<CefrBadge level={value}>` with a click handler that sets `editingCefrField`.
  - If value is empty OR field is being edited: render the `<Select>` with `onOpenChange` that clears `editingCefrField` when closed.
  - If no value (empty/`__none__`): render a light placeholder button "Set level" that triggers the select.
- Apply to Teacher's Assessment, Official Level, and all 4 Skill Override selects.
- The `CefrBadge` component already exists at `frontend/src/components/dashboard/CefrBadge.tsx` with correct colors. Import and reuse as-is.

**Test coverage:** Unit test that CEFR badge renders when value is populated (existing `student-cefr` testId behavior).

---

### AC2: Language chip display (full roundedness)

**Affected components:** Spoken Languages chips in `StudentForm`, Native Languages chips in `MultiSelect`

**Current state:**
- Spoken langs: `rounded` class (4px corners)
- Native langs via MultiSelect: `rounded` class (line 143 in `multi-select.tsx`)
- Interests: `rounded` class

**Target state:** Indigo pill chips with `rounded-full` (9999px) to match Stitch chip pattern.

**Implementation:**
- In `StudentForm.tsx`: change spoken language chip className from `rounded` to `rounded-full`.
- In `StudentForm.tsx`: change interest chip className from `rounded` to `rounded-full`.
- In `multi-select.tsx`: change chip className from `rounded` to `rounded-full`.

**Note on #725 conflict:** #725 will replace the native/spoken/learning language fields with comboboxes and render chips using a potentially different structure. The `rounded-full` change to `multi-select.tsx` is safe regardless. When #725 merges, the new combobox chip output should also use `rounded-full` (already specified in #725 as "indigo pills per Stitch").

---

### AC3: Personal Background editorial treatment ("Reason for Studying")

**Current state:** Plain `<Textarea>` in a single-column card.  
**Target state:** Two-column layout with decorative quotation mark framing the textarea.

**Implementation:**
- Restructure the Reason for Studying card content to a 2-column grid (`grid grid-cols-[auto,1fr] gap-4`):
  - Left column: a decorative `"` character in large Manrope font (`font-manrope text-6xl text-indigo-200 leading-none select-none`), absolutely-positioned or inline.
  - Right column: the existing textarea (keep all current attributes, just move into right column).
- This is purely cosmetic; no state or API changes.

---

### AC4: Skill Overrides placement (move lower)

**Current state:** Skill Overrides card sits in the right column of the 2-column `section-basic` grid, visually at the same height as Basic Info. This gives it undue prominence.

**Target state:** Skill Overrides moved below the 2-column Basic Info + Languages grid, still in a right-column-like position at the bottom of the proficiency area.

**Implementation:**
- Change the layout of `section-basic` div:
  - Remove Skill Overrides from the right column of the top 2-col grid.
  - After the 2-col grid (Basic Info + Languages left, currently Skill Overrides right), add a new row below that only contains Skill Overrides, but styled to appear in the right half (using `ml-auto w-[5fr/12]` or `grid grid-cols-[7fr_5fr]` with an empty left).
  - Keep `id="section-proficiency"` on the Skill Overrides wrapper to preserve scrollspy anchor.
- **Update scrollspy:** The inline comment at line 56-57 explains that `section-proficiency` was excluded from `SCROLLSPY_IDS` because it shared the same Y position as `section-basic`. After this move, Skill Overrides will be at a distinct lower Y position. Add `section-proficiency` back into `SCROLLSPY_IDS` (after `section-basic`) and add a matching entry in `FORM_SECTIONS` if not already there (it already exists). Also add `section-proficiency` to `SCROLLSPY_IDS`.

---

### AC5: Teaching Goals richness

**Current state:** Learning Goals rendered as a flat tree list (`LearningGoalTreeEditor`). Short-term objectives are plain input rows.

**Target state:**
- Each root learning goal rendered as a styled card (white bg, light shadow, title + children shown).
- Short-term objectives have left-border accent (warm/orange tone) and a calendar icon.

**Implementation:**

**Learning Goals:**
- The `LearningGoalTreeEditor` renders a flat interactive list. This task adds styling. Two options:
  - Option A: Wrap each top-level `GoalRow` in a card-like container inside `LearningGoalTreeEditor` (add `bg-white rounded-lg p-3 shadow-sm` per root goal).
  - Option B: Pass a `cardMode` prop to `LearningGoalTreeEditor` that enables the styled rendering.
- Use Option A: modify `LearningGoalTreeEditor.tsx` to wrap each root goal (depth=0) in a `div` with `bg-[#FFFFFF] rounded-lg p-3 border border-[#F4F2FD] space-y-1 mb-2` card styling.
- Note: `LearningGoalItem.description` does not exist in the data model. Cards will show `goal.text` as the title; children are rendered as the "description content" sub-list within the card. This matches what's achievable without a backend change.

**Short-Term Objectives:**
- Add `border-l-4 border-orange-400` left accent to each objective row.
- Import `Calendar` from `lucide-react` and show it next to the date input.
- Style the objective row container: `pl-3 rounded-r-lg bg-orange-50/30`.

---

### AC6: Difficulties section visual richness

**Current state:** Flat inline rows: description input, competency select, subcategory input, Active/Covered toggle, delete button.

**Target state:** More visual weight — severity indicator bar and trend arrow per row.

**Implementation:**
- The `Difficulty` model already has `severity: string` and `trend: string` fields.
- After the difficulty row inputs, add a compact visual row:
  - **Severity bar:** A `div` with a colored background at 33%/66%/100% width based on `d.severity` (low/medium/high). Container: `w-16 h-1.5 bg-zinc-100 rounded-full`. Fill: `h-full rounded-full` with `bg-green-500` (low), `bg-amber-500` (medium), `bg-red-500` (high).
  - **Trend arrow:** Import `TrendingUp`, `TrendingDown`, `Minus` from `lucide-react`. Show the appropriate icon next to the severity bar based on `d.trend` (improving=TrendingUp green, worsening=TrendingDown red, stable=Minus zinc).
- Add a compact sub-row below the main difficulty inputs showing the severity bar + trend icon.
- This uses existing data — no API or state changes.

---

### AC7: Delete button safety (move out of header)

**Current state:** Red "Delete" button is in the `PageHeader` actions area, next to "Create Course" at the top of the page.

**Target state:** Delete moved to the bottom of the page, below the Commercial section.

**Implementation:**
- Remove the Delete button from the `PageHeader` `actions` prop block (lines ~463-474 in `StudentForm.tsx`).
- Remove the `deleteError` span at line 501-502 (currently positioned between header and sticky nav).
- Add a "Danger Zone" section at the bottom of the main form area, after `section-commercial`, containing both the Delete button AND the `deleteError` display together:
  ```
  <div className="pt-6 border-t border-zinc-100 space-y-2">
    {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
    <Button variant="ghost" onClick={() => setShowDeleteDialog(true)} className="text-red-500 text-sm">
      Delete this student
    </Button>
  </div>
  ```
- The `showDeleteDialog` state and `AlertDialog` remain unchanged.

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/pages/StudentForm.tsx` | AC1 (CEFR badge), AC2 (chip roundedness), AC3 (quote treatment), AC4 (skill override placement), AC5 (objective accent), AC6 (difficulty visuals), AC7 (delete button) |
| `frontend/src/components/ui/multi-select.tsx` | AC2 (chip `rounded-full`) |
| `frontend/src/components/student/LearningGoalTreeEditor.tsx` | AC5 (goal card styling) |

---

## Conflict with #725

When #725 merges into the sprint branch, this branch will need to merge. Expected conflict areas:
- Language fields (Native/Spoken/Learning) — #725 replaces them with combobox components
- Header Save/Cancel area — #725 removes Save Profile button and adds autosave status indicator
- `FORM_SECTIONS` / scrollspy may change if #725 restructures sections

Resolution approach: merge sprint into this branch after #725 lands, resolve conflicts manually. The visual changes here (chip roundedness, CEFR badges, quote treatment, skill override placement, goal cards, difficulty visuals, delete placement) are largely orthogonal to #725's functional changes.

---

## Unit Test Coverage

The existing `StudentForm.test.tsx` covers form rendering and mutations. For this task:
- Unit test: CEFR badge renders when value set, Select hidden (AC1)
- Unit test: chip has `rounded-full` class on spoken/native/interest chips (AC2)
- Unit test: Delete button not in header, present at bottom of page (AC7)
- Unit test: deleteError message renders near the Delete button, not in the header area (AC7)
- Unit test in `LearningGoalTreeEditor.test.tsx`: root goal renders inside a card container (AC5)

No new e2e test needed for purely visual changes (severity bars, quote decoration, chip shape) that do not affect user flows.

---

## Dependency Note

This plan is written against the pre-#725 code. The autosave refactor from #725 is expected to land before this PR is merged. After #725 merges:
1. Merge `origin/sprint/ui-redesign-student-polish` into this branch
2. Resolve conflicts in the language/header areas
3. Re-run build and tests
