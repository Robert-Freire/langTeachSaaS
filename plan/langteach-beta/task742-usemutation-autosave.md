# Task 742 — useMutation for useStudentAutosave

## Goal

Replace the manual retry loop and status state in `useStudentAutosave` with React Query's `useMutation`, aligning with the rest of the project's convention. The debounce orchestration (scheduleTextSave / saveNow) and the public hook API remain unchanged.

## Files Changed

- `frontend/src/hooks/useStudentAutosave.ts` — refactored
- `frontend/src/hooks/useStudentAutosave.test.ts` — updated for QueryClientProvider wrapper

## Design

### Status mapping

The `SaveStatus` type stays the same. Derived from mutation state:

| Condition | Status |
|-----------|--------|
| `isIdle` | `'idle'` |
| `isPending && failureCount === 0` | `'saving'` |
| `isPending && failureCount > 0` | `'retrying'` |
| `isSuccess` | `'saved'` |
| `isError` | `'error'` |

### Retry

`useMutation({ retry: MAX_RETRIES, retryDelay: RETRY_DELAY_MS })` replaces the manual `retryCountRef` + `retryTimerRef` + `setTimeout` loop.

React Query retries with the same variables as the original call, which is semantically correct (save the data that was submitted, not re-read form at retry time).

### Idle reset

React Query keeps `isSuccess: true` indefinitely. A single `useEffect` on `mutation.isSuccess` starts a 2s timer that calls `mutation.reset()` to return to idle. Timer is cleared on unmount.

### Removed

- `isMountedRef` — React Query's `mutate()` is safe to call after unmount; the idle timer is cleaned up via useEffect.
- `retryCountRef`, `retryTimerRef` — delegated to React Query.
- `setStatus` — derived from mutation state.

### mutationFn signature

```ts
useMutation({
  mutationFn: ({ studentId, data }: { studentId: string; data: StudentFormData }) =>
    updateStudent(studentId, data),
  retry: MAX_RETRIES,
  retryDelay: RETRY_DELAY_MS,
})
```

## Test changes

- Add `QueryClientProvider` wrapper to `renderHook` calls using a factory function.
- QueryClient defaults do NOT need to override retry — the hook-level `retry: MAX_RETRIES` on `useMutation` merges on top of QueryClient defaults. Keep the test QueryClient simple: `new QueryClient()` with no special retry override.
- Timer-based tests continue to use `vi.useFakeTimers()` — React Query uses `setTimeout` internally for retry delays, so fake timers work and `vi.runAllTimersAsync()` correctly advances through all retry cycles.
- The `retrying` status (isPending + failureCount > 0) is exercised implicitly by the existing "retries after error" test. No new test is required since there was no pre-existing test for it either.
- `mutation.reset()` is safe: the hook only exposes `{ status, scheduleTextSave, saveNow }` to callers, so no caller has access to `mutation.variables` or `mutation.data`. The idle timer clearing in useEffect cleanup ensures `reset()` is not called after unmount.
- The debounce timer may fire `mutate()` after unmount (isMountedRef removed), but React Query v5 handles post-unmount mutate calls safely without React state-update warnings, since status is derived from React Query state, not local useState.

## Acceptance Criteria (from issue)

- [x] `updateStudent` wrapped with `useMutation`
- [x] Retry count and success/error status delegated to React Query
- [x] Debounce timer and `saveNow`/`scheduleTextSave` API unchanged
- [x] Tests updated
