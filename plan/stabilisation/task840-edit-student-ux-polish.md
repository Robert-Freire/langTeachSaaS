# Task 840 — Edit Student Form UX Polish

## Issue
#840: polish: Edit Student form minor UX improvements (language combobox summary, Focus Areas description)

## Changes

### 1. MultiSelect trigger summary (`frontend/src/components/ui/multi-select.tsx` line 91)

**Current:** `${selected.length} selected` for any non-zero selection.

**Fix:** Show a meaningful label:
- 0 selected: placeholder (unchanged)
- 1 selected: label of the selected item (e.g. "Spanish")
- 2+ selected: label of first item + rest count (e.g. "Spanish +2 more")

Look up label via `options.find(o => o.value === selected[0])?.label ?? selected[0]`.

### 2. Focus Areas table subcategory cell (`frontend/src/components/student/StudentProfileTab.tsx` line 721)

**Current:** `{d.subcategory || d.description}` — description is hidden whenever subcategory is set.

**Fix:** Show subcategory as primary, description as secondary muted line below when both are non-empty:
```
Verb forms
Separable vs inseparable phrasal verbs   ← text-xs text-zinc-400
```
When subcategory is empty, keep existing fallback (description as primary, no secondary line).

### 3. Unit tests (new file `frontend/src/components/ui/multi-select.test.tsx`)

Cover the trigger label logic:
- 0 items: shows placeholder
- 1 item: shows the item's label
- 2 items: shows "FirstLabel +1 more"
- 3 items: shows "FirstLabel +2 more"

## Acceptance Criteria Checklist
- [ ] Combobox 2+ selected: "FirstLanguage +N more"
- [ ] Combobox 1 selected: language name only
- [ ] Focus Areas: description as muted secondary line when non-empty
- [ ] No regressions in Edit Student form
- [ ] Unit test covers 1, 2, 3+ selections
