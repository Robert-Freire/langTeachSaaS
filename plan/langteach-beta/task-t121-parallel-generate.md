# Task T121: Parallel Generate All

## Problem
`FullLessonGenerateButton.handleConfirm` uses a sequential `for` loop (line 91) to generate sections one at a time. Each section waits for the previous one to complete before starting.

## Solution
Replace the sequential loop with parallel execution using `Promise.allSettled` to fire all section generations concurrently. `Promise.allSettled` (not `Promise.all`) is required so that one section's failure does not short-circuit the others.

### Changes to `FullLessonGenerateButton.tsx`

1. **Remove sequential loop**, replace with `Promise.allSettled`:
   - Map `activeSections` into an array of async functions, each wrapping `streamText` + `saveContentBlock` + `onBlockSaved` + status update in a try/catch
   - Set all sections to `active` immediately (instead of one at a time)
   - Each promise individually updates its section status to `done` or `error` on completion
   - Call `onBlockSaved` per section as each completes (not waiting for all)
   - After `Promise.allSettled` resolves, check results: if any section has `error` status, set phase to `error` with a message listing which sections failed; otherwise set phase to `done`

2. **Remove `currentIndex` state** (no longer meaningful with parallel execution)

3. **Update progress indicator**: Derive completed count from `sectionStatus` (count entries with `done` or `error`). Use `activeSections.length` as denominator (not `sections.length` prop). Format: "2 / 5 complete". Keep existing "All sections complete" text for the `done` phase.

4. **Error handling**: Each section's promise has its own try/catch. On `AbortError`, set status to `error` silently (the `handleCancel` already sets phase to `idle`). On other errors, set section status to `error` and collect the error message. After all settle, if any failed, show error phase with combined message.

5. **Abort**: The shared `AbortController` still cancels all in-flight requests when the user clicks Cancel.

### Changes to `FullLessonGenerateButton.test.tsx`

- Update "successful generation" test: `onBlockSaved` still called 5 times, but order may vary (check set of blockTypes, not array order)
- Update progress indicator tests: new progress text format ("X / Y complete")
- Update error test: with parallel execution all 5 `streamText` calls fire in `activeSections.map` order, so `.mockResolvedValueOnce`/`.mockRejectedValueOnce` chains still work deterministically. But now the other 4 sections succeed, so `onBlockSaved` is called 4 times (not 1). Assert that the failed section shows `error` status and the dialog shows the error message.
- Add test: verify all sections show `active` status simultaneously during generation

### E2E test
- `e2e/tests/full-lesson-generation.spec.ts` should still pass (it waits for the "Lesson generated!" dialog)

## Risk
Low. The backend already supports concurrent requests. `streamText` is stateless per call. The only shared mutable state is the `AbortController`, which is designed for multi-signal use.
