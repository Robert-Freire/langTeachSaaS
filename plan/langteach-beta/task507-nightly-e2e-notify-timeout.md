# Task 507: Nightly E2E - notify on job timeout and cancellation

## Problem

The `Create failure issue` step in `.github/workflows/nightly-e2e.yml` uses `if: failure()`, which only fires on step failure within the job. If the job times out (`timeout-minutes: 30`) or is manually cancelled, `if: failure()` is skipped and no issue is created.

## Solution

Move the failure notification to a separate `notify_failure` job that depends on both `check-changes` and `e2e`, using `if: always()` so it runs regardless of how the e2e job ended.

### Changes to `.github/workflows/nightly-e2e.yml`

1. Remove `issues: write` from the `e2e` job permissions (no longer needed there)
2. Remove the `Create failure issue` step from the `e2e` job
3. Add a new `notify_failure` job:
   - `needs: [check-changes, e2e]`
   - `if: always() && needs.e2e.result != 'success' && needs.e2e.result != 'skipped' && needs.check-changes.outputs.should_run == 'true'`
   - `permissions: issues: write`
   - One step: same deduplication + issue creation logic as before

## Acceptance Criteria

- Failure issue is created when e2e job times out
- Failure issue is created when e2e job is cancelled
- Failure issue is created when an e2e step fails (existing behaviour preserved)
- No issue is created when e2e is skipped (no new commits)
- No issue is created when e2e succeeds
