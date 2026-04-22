# Task 775 — Edit Student: Layout Alignment + Interaction Polish

**Issue:** #775  
**Sprint branch:** sprint/ui-redesign-student-polish  
**File:** `frontend/src/pages/StudentForm.tsx` (1469 lines)

---

## Scope

All changes in `StudentForm.tsx` and its test file `StudentForm.test.tsx`.

---

## Part A — Layout Changes

### A1. Merge Languages card into Basic Info card
**Current:** Separate `<Card>` below Basic Info with title "Languages", containing Native Languages and Spoken Languages MultiSelects.  
**Fix:** Move both MultiSelects inside the existing Basic Info `<Card>`, below the Official Level field, separated by a thin border-t rule. Remove the standalone Languages card.  
**Impact:** No state changes. Pure DOM restructuring.

### A2. Teaching Goals + Difficulties side-by-side 2-column layout
**Current:** `section-teaching-goals` and `section-difficulties` are separate full-width sections, each in their own `<div id=...>`.  
**Fix:** Wrap both inside a single `<div id="section-teaching-goals" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">`. Teaching Goals (Learning Goals + Short-Term Objectives) on left, Difficulties (Areas to Improve + Specific Difficulties) on right. Add `id="section-difficulties"` to the right column div so scrollspy still works.  
**Tablet breakpoint:** `grid-cols-1` stacks below `lg` (1024px). At `md` (768px) they are still stacked — acceptable per AC.

### A3. Rename Notes labels
**Current:** Label "Personal notes" / subtitle "Sensitivities / life context." and Label "Teaching notes" / subtitle "Learning style, teaching observations."  
**Fix:**
- Left label → "Sensitivities / Life Context"
- Right label → "Pedagogical Observations"  
- Remove the separate subtitle `<p>` elements (labels are now self-describing).
- Update placeholders: left → "Sensitivities, life context, anything to be aware of...", right → "Learning style, teaching observations..."
- Update `data-testid` values: keep existing (`student-personal-notes`, `student-teaching-notes`) — test IDs on the textareas are unchanged.

---

## Part B — Interaction Affordances

### B4. CEFR badge pencil icon on hover (Teacher's Assessment)
**Current:** `CefrBadge` wrapped in a `<button>` with `hover:opacity-80` only.  
**Fix:** Add `Pencil` to the lucide-react import. Wrap badge in a relative container; overlay a `<Pencil className="h-3 w-3">` in the top-right corner, visible only on `group-hover`. Pattern: `<button className="relative group block">` + badge + `<span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white shadow-sm border border-zinc-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5 text-zinc-500" /></span>`. Add cursor-pointer.  
**Scope:** Only Teacher's Assessment badge (cefrLevel). Official Level and Skill Overrides badges are secondary; issue doesn't call them out explicitly - but B9 handles Official Level separately.

### B5. Auto-focus new objective input
**Current:** `addObjective()` pushes a new row but no focus.  
**Fix:** Extract a named `ObjectiveRow` component (defined inside the file, above `StudentForm`). It receives `obj`, `autoFocus: boolean`, `onUpdate`, `onRemove`. Internally it uses `useEffect(() => { if (autoFocus) inputRef.current?.focus() }, [autoFocus])`. In `StudentForm`, add `newObjectiveIdRef = useRef<string | null>(null)`. In `addObjective()`, store the new id in `newObjectiveIdRef.current`. Each `<ObjectiveRow>` receives `autoFocus={obj.id === newObjectiveIdRef.current}`.

### B6. Difficulty description - auto-resize textarea
**Current:** `<Input>` (single-line `h-9`) for `d.description`.  
**Fix:** Replace with `<Textarea>` (`rows={1}` + `resize-none` + `overflow-hidden` + `onInput` handler that sets `el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'`). Apply same `data-testid="difficulty-description"`. Keep `maxLength={500}`. Style: `min-h-[2.25rem]` to match the grid height of other cells.

### B7. Objective rows - amber palette instead of orange-300
**Current:** `border-l-4 border-orange-300` and `bg-orange-50/30`.  
**Fix:** `border-l-4 border-amber-400` and `bg-amber-50/40`. (amber-400 = `#fbbf24`, close to design system warning amber.)

### B8. Date input border + remove redundant Calendar icon
**Current:** `border border-zinc-200` on date input + `<Calendar>` Lucide icon before the input + browser native calendar icon.  
**Fix:**
- Remove the `<Calendar className="h-4 w-4 ...">` element entirely.
- Change input className: replace `border border-zinc-200` with `outline outline-1 outline-[#C7C4D8]/20`. Keep existing `focus:outline-none focus:ring-2 focus:ring-indigo-300` focus styles unchanged.

### B9. Official Level empty state - ghost badge instead of bordered Select
**Current:** When `officialCefrLevel === ''`, renders a `<SelectTrigger>` with visible border.  
**Fix:** When empty AND not editing (`editingCefrField !== 'officialCefrLevel'`), render a ghost button styled as a faint badge:
```tsx
<button
  type="button"
  onClick={() => setEditingCefrField('officialCefrLevel')}
  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-zinc-400 border border-dashed border-zinc-300 hover:border-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
  aria-label="Set Official Level"
  data-testid="student-official-cefr-badge"
>
  Not set
</button>
```
When `editingCefrField === 'officialCefrLevel'`, open the Select as before.

---

## Tests to add/update in `StudentForm.test.tsx`

1. **A1:** Assert that Native/Spoken Languages fields appear without a separate "Languages" card heading.
2. **A2:** Assert that `section-teaching-goals` and `section-difficulties` are present in the DOM.
3. **A3:** Assert that Notes section contains "Sensitivities / Life Context" and "Pedagogical Observations" labels.
4. **B4:** Assert that the Teacher's Assessment badge button has a pencil icon (`.lucide-pencil` or `aria-hidden` SVG inside the button).
5. **B5:** Assert that after clicking `add-objective`, the new input gets focus (use `toHaveFocus()`).
6. **B6:** Assert that difficulty description field is rendered as a `<textarea>` element (not `<input>`).
7. **B7:** Assert objective rows use amber class (not orange-300).
8. **B8:** Assert no Lucide Calendar icon adjacent to date input in objective rows.
9. **B9:** Assert Official Level ghost badge renders when `officialCefrLevel` is empty in edit mode; clicking it triggers Select.

---

## E2E coverage

The existing Playwright test in `e2e/tests/students.spec.ts` covers edit student navigation. No new e2e test needed — the layout changes are pure visual rearrangements tested at unit level. Autosave and chip functionality are already covered.

---

## Risk / Watch-outs

- `SCROLLSPY_IDS` array still lists `section-difficulties` — this ID must remain in the DOM even after the layout refactor (it will be on the right-column div of the 2-col grid).
- `FORM_SECTIONS` nav labels are unchanged; scrollspy still navigates correctly.
- The 2-col Teaching Goals / Difficulties layout introduces a fixed visual height difference between left and right columns when one column is much taller. `items-start` prevents stretching.
