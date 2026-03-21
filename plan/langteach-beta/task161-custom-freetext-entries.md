# Task 161: Learning goals and weaknesses should allow custom free-text entries

**Issue:** #161
**Status:** Planning
**Branch:** `worktree-task-t161-custom-freetext-entries`

## Problem

The MultiSelect component in StudentForm.tsx (lines 41-135) only allows selecting from predefined options. Teachers cannot enter custom learning goals (e.g., "pass DELE B2 in June") or custom weaknesses. This blocks the demo where Willem needs personalized goals.

## Analysis

- **Backend:** Already accepts arbitrary `List<string>` for both fields (max 20 items/100 chars for goals, max 30 items/200 chars for weaknesses). No backend changes needed.
- **Frontend:** The inline `MultiSelect` component uses shadcn Command (combobox-like) but only renders predefined `CommandItem`s. Need to add "create custom entry" functionality.
- **Data model:** Custom entries are stored as plain strings alongside predefined values. The chip display already falls back to raw value when no matching label is found (line 112: `options.find(...)?.label ?? value`).

## Approach

Convert the `MultiSelect` component to a combo box that supports custom entries. When the user types text that does not match any predefined option, show an "Add [typed text]" option that, when selected, adds the custom string to the selection.

### Changes

#### 1. Modify `MultiSelect` in `StudentForm.tsx` (lines 41-135)

- Add state to track the current search/input text (`inputValue`)
- After the predefined `CommandGroup`, add a conditional "Add custom entry" `CommandItem` that appears when:
  - `inputValue` is non-empty AND
  - `inputValue` does not exactly match an existing option label (case-insensitive) AND
  - `inputValue` is not already in the `selected` array
- When that item is selected: add the trimmed input text to `selected`, clear the input
- Add a new optional prop `allowCustom` (defaulting to `true`) to control this behavior, keeping the component reusable for fields that should NOT allow custom entries (like difficulty categories)
- Access the `CommandInput` value via a ref or controlled state to capture typed text

#### 2. Unit tests in `StudentForm.test.tsx`

- Test: type custom text in learning goals, select the "Add..." option, verify chip appears
- Test: custom entry chip can be removed with X button
- Test: predefined options still work alongside custom entries

#### 3. E2E test in `e2e/tests/students.spec.ts`

- Create student with a custom learning goal (type + Enter/click the add option)
- Save, navigate back to edit
- Verify the custom goal chip persists

## Files to modify

| File | Change |
|------|--------|
| `frontend/src/pages/StudentForm.tsx` | Add custom entry support to MultiSelect |
| `frontend/src/pages/StudentForm.test.tsx` | Add unit tests for custom entries |
| `e2e/tests/students.spec.ts` | Add e2e test for custom entry persistence |

## Out of scope

- Backend changes (not needed, already accepts arbitrary strings)
- Changing predefined option lists
- #150 (language filtering of weaknesses, separate issue)
