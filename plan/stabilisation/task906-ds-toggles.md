# Task #906 - Replace native checkboxes with DS §11.4 custom toggles

## Summary

Three native `<input type="checkbox">` violations in LogSession.tsx:

1. Teaching Todos panel (line ~666): replace with indigo square button
2. Followups panel (line ~696): replace with amber circle button  
3. Student Difficulties panel (line ~793): replace with amber circle button

`TeachingTodosCard.tsx` and `StudentOverviewTab.tsx` are already compliant.

## DS §11.4 Specs

**Indigo square (Teaching Todos):**
- Pending: `w-4 h-4 rounded border-2 border-indigo-400 hover:border-indigo-600`
- Covered: `w-4 h-4 rounded border-2 bg-green-500 border-green-500` + Check icon (h-2.5 w-2.5 white)
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600`

**Amber circle (Followups & Difficulties):**
- Pending: `w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-100 hover:bg-amber-500`
- Done: `w-3 h-3 rounded-full bg-emerald-500 border-emerald-500`
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600`

## Changes

### LogSession.tsx
- Add `Check` to lucide-react imports
- Teaching Todos: `<label>` → `<div>`, `<input type="checkbox">` → `<button>` with indigo square + `aria-pressed` + testid `teaching-todo-toggle`
- Followups: `<label>` → `<div>`, `<input type="checkbox">` → `<button>` with amber circle + `aria-pressed` + testid `followup-toggle`  
- Difficulties: `<label>` → `<div>`, `<input type="checkbox">` → `<button>` with amber circle + `aria-pressed` + testid `difficulty-toggle`

### LogSession.test.tsx
- Update tests using `teaching-todo-checkbox` → `teaching-todo-toggle` (HTMLButtonElement, aria-pressed)
- Update tests using `followup-checkbox` → `followup-toggle` (HTMLButtonElement, aria-pressed)
- Add tests: toggle on, toggle off, keyboard Space key activation (all 3 locations)
