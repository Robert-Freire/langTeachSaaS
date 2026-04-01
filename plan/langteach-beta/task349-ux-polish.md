# Task 349: UX Polish - Auto-scroll, Accessibility, Error States, Pedagogical Mismatch

## Issue
#349 — batched from UI review backlog (PRs #310, #308), observed issues (#309), and code review backlog (#334).

## Acceptance Criteria
- [ ] GeneratePanel auto-scrolls into view when opened
- [ ] useSectionRules surfaces error state to the user
- [ ] Close link meets WCAG 4.5:1 contrast
- [ ] Task-type div is keyboard-accessible and screen-reader-announced
- [ ] "Free activity" removed from Presentation section content type options
- [ ] Learning-target editing state resets on lesson/student navigation

---

## Analysis

### Item 1: GeneratePanel auto-scroll (Important)
`GeneratePanel` renders at line 801 in `LessonEditor.tsx` inside `{isGenerateOpen && <GeneratePanel ...>}`.
On mount, the panel may appear below the visible area for WarmUp/WrapUp (sections lower in the page).
**Fix:** Add a `useRef` to the panel root div and call `ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` in a mount-only `useEffect`.

### Item 2: useSectionRules silent error (Important)
`useSectionRules` returns `useQuery` result but `GeneratePanel` only destructures `data`:
```ts
const { data: sectionRules } = useSectionRules()
```
If the fetch fails permanently (no retries: `staleTime: Infinity`), `sectionRules` stays `undefined` and content-type filtering silently falls back to `ALL_CONTENT_TYPES` with no feedback.
**Fix:**
- `useSectionRules.ts`: add `retry: 2` (allow retries) and export the hook result including `error`/`isError`.
- `GeneratePanel.tsx`: destructure `error` and `isLoading` from `useSectionRules()` and show an inline amber warning below the Task type select when `isError` is true and rules have not loaded.

### Item 3: Close link contrast (Minor, Accessibility)
Line 213 in `GeneratePanel.tsx`:
```tsx
className="text-xs text-zinc-400 hover:text-zinc-600"
```
`text-zinc-400` (#a1a1aa on indigo-50 bg) gives ~3.5:1 ratio. WCAG AA requires 4.5:1 for small text.
**Fix:** Change to `text-zinc-600` (#52525b) which gives ~5.9:1 on white/indigo-50.

### Item 4: Task-type read-only div not keyboard-navigable (Minor, Accessibility)
Lines 223-232 in `GeneratePanel.tsx`: when `filteredTaskTypes.length === 1`, renders a plain `<div>` with no `tabIndex` or ARIA role. Screen readers skip it; it cannot be tabbed to.
**Fix:** Add `tabIndex={0}` and `role="status"` to the div. Associate it with the existing `Label` via `id`/`aria-labelledby`.

### Item 5: "Free activity" in Presentation during rules loading (Minor, Pedagogical)
`getAllowedContentTypes` returns `ALL_CONTENT_TYPES` (includes `free-text`) when `rules === undefined` (loading).
During loading, the Presentation section shows "Free activity" as an option.
When rules load, `presentation.json` correctly excludes `free-text` — the bug only manifests during loading or permanent error states.
**Fix:** Change the loading fallback from `ALL_CONTENT_TYPES` to `[]` (empty array). Update `GeneratePanel` to:
- Disable the Generate button when `allowedTypes.length === 0`
- Show a subtle "Loading types..." skeleton or disabled select while loading
- Fix the `useEffect` taskType reset guard: `allowedTypes[0] ?? current` to avoid setting `undefined`
- Update existing test in `sectionContentTypes.test.ts` that asserts `undefined` returns `ALL_CONTENT_TYPES`

### Item 6: Learning-target editing state not reset on navigation (Minor, State)
`editingTargets`, `targetsDraft`, `newTagInput` are local state in `ContentBlock`. They are not reset when `block.id` changes (which happens when lesson data reloads after navigation). The root div is keyed by `block.id` but since LessonEditor may reuse component instances across lesson navigations (no key on the Route), state can persist.
**Fix:** Add `useEffect` in `ContentBlock` that resets the learning-target editing state when `block.id` changes:
```ts
useEffect(() => {
  setEditingTargets(false)
  setTargetsDraft([])
  setNewTagInput('')
}, [block.id])
```

---

## Files to Change

| File | Change |
|------|--------|
| `frontend/src/components/lesson/GeneratePanel.tsx` | Items 1, 2, 3, 4, 5 |
| `frontend/src/hooks/useSectionRules.ts` | Item 2: add `retry: 2` |
| `frontend/src/utils/sectionContentTypes.ts` | Item 5: fallback `[]` |
| `frontend/src/components/lesson/ContentBlock.tsx` | Item 6: reset effect |
| `frontend/src/components/lesson/GeneratePanel.test.tsx` | Tests for items 1, 2, 4 |
| `frontend/src/utils/sectionContentTypes.test.ts` | Update loading-fallback tests |
| `frontend/src/components/lesson/ContentBlock.test.tsx` | Test for item 6 |

---

## Test Plan

1. **Auto-scroll (item 1):** Mock `scrollIntoView`, render GeneratePanel, verify it was called on mount.
2. **Error state (item 2):** Mock `useSectionRules` to return `{ data: undefined, isError: true, error: new Error('Network error') }`. Verify error message is rendered.
3. **Contrast (item 3):** Visual only — no unit test.
4. **Keyboard (item 4):** Render panel with `filteredTaskTypes.length === 1`. Assert readonly div has `tabIndex="0"` and `role="status"`.
5. **Free activity (item 5):** Update `sectionContentTypes.test.ts` — `undefined` rules now return `[]`. Add test that Generate button is disabled when types are loading.
6. **State reset (item 6):** Render ContentBlock, simulate opening edit-targets mode, re-render with a different `block.id`, assert `editingTargets` is false (editing UI not visible).

---

## E2E
No new e2e tests required for this task (all fixes are minor UI polish to existing flows; happy-path e2e coverage exists for lesson generation).
