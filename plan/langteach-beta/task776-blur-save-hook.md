# Task 776 — Extract useBlurSave hook

## Goal

Extract duplicated blur-save indicator state from `SessionHistoryTab` and `StudentProfileTab` into a shared `useBlurSave` hook.

## Context

Both files hand-roll the same pattern inline:
- `savedVisible` + `savedTimerRef` (auto-hide after 1500ms)
- `fieldError` + `errorTimerRef` (auto-clear after 3000ms)
- Cleanup effect on unmount

The issue names the constants as `SAVED_VISIBLE_DURATION_MS` and `ERROR_VISIBLE_DURATION_MS` but these don't exist in `autosaveConstants.ts` yet — they must be added.

## Files Changed

1. `frontend/src/lib/autosaveConstants.ts` — add `SAVED_VISIBLE_DURATION_MS = 1500`, `ERROR_VISIBLE_DURATION_MS = 3000`
2. `frontend/src/hooks/useBlurSave.ts` — new hook
3. `frontend/src/components/session/SessionHistoryTab.tsx` — use hook in `SessionEntry`
4. `frontend/src/components/student/StudentProfileTab.tsx` — use hook in `ReasonSection` and `InterestsSection`
5. `frontend/src/hooks/useBlurSave.test.ts` — unit tests

## Hook API

```ts
export function useBlurSave(): {
  savedVisible: boolean
  fieldError: string | null
  onSaveSuccess: () => void
  onSaveError: (message: string) => void
  clearError: () => void
}
```

- `onSaveSuccess()`: sets `savedVisible=true`, auto-hides after `SAVED_VISIBLE_DURATION_MS`, clears `fieldError`
- `onSaveError(message)`: sets `fieldError=message`, auto-clears after `ERROR_VISIBLE_DURATION_MS`
- `clearError()`: clears `fieldError` immediately (for validation before API call)
- Cleanup: clears both timers on unmount

## Refactor Notes

### SessionHistoryTab (SessionEntry)

`fieldError` is used for both validation errors (before API call) and API errors. The `clearError` export handles the validation path; `onSaveError` handles the API path.

Replace:
- `useState(false)` savedVisible + `useState(null)` fieldError + two `useRef` timers + cleanup `useEffect`
- All timer management calls in `handleFieldBlur`

Keep:
- `isRevertingRef` (not related to save indicators)
- `deleteOpen`/`deleteError` (delete flow, not blur-save)

### StudentProfileTab

Two components need the hook independently: `ReasonSection` and `InterestsSection`. Both use `saveError` (not `fieldError`) as the variable name — rename to `fieldError` from the hook destructure.

## Tests

`useBlurSave.test.ts` covers:
1. `savedVisible` starts false, becomes true after `onSaveSuccess`, auto-hides after `SAVED_VISIBLE_DURATION_MS`
2. `fieldError` starts null, becomes message after `onSaveError`, auto-clears after `ERROR_VISIBLE_DURATION_MS`
3. `onSaveSuccess` clears any existing `fieldError`
4. Timers cleaned up on unmount (no setState after unmount)

## Acceptance Criteria

- [ ] `useBlurSave` at `frontend/src/hooks/useBlurSave.ts`
- [ ] `SessionHistoryTab` — no hand-rolled savedVisible/savedTimerRef/fieldError/errorTimerRef
- [ ] `StudentProfileTab` — same inline state removed from both ReasonSection and InterestsSection
- [ ] `useBlurSave.test.ts` — 4 tests pass
- [ ] Existing tab tests still pass
