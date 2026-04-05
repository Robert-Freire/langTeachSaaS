# Task 499: Fix backend deploy for single-revision Container App mode

## Problem

The backend deploy job in `.github/workflows/backend.yml` (lines 111-231) uses
`az containerapp ingress traffic set --revision-weight` to:
1. Pin traffic to the old revision during health check (line 168-173)
2. Shift 100% traffic to the new revision after it reaches Running state (lines 195-199)

These calls fail in single-revision mode because traffic weight management is a
multiple-revision mode feature. In single-revision mode, Azure routes traffic to
the active revision automatically. No deploy has succeeded since 2026-03-22.

## Fix

Simplify the deploy job to remove all `az containerapp ingress traffic set` calls
and the OLD_REVISION tracking that existed solely to support traffic pinning.

### Simplified flow

1. `az acr build` (unchanged)
2. `az containerapp registry set` (unchanged)
3. `az containerapp update` to deploy new revision (simplified: remove OLD_REVISION
   capture and traffic pinning)
4. Poll `runningState` until Running (success) or ActivationFailed/Failed (failure)
   In single-revision mode there is no old revision to restore traffic to, so on
   failure just log and exit 1.

## File changed

`.github/workflows/backend.yml`, deploy job steps:
- "Deploy new revision (hold traffic on old revision)" -> "Deploy new revision"
  Remove: OLD_REVISION capture, `az containerapp ingress traffic set` pin call
- "Wait for revision health and shift traffic" -> "Wait for revision to reach Running state"
  Remove: `az containerapp ingress traffic set` shift call
  Remove: OLD_REVISION restore references in failure branches
  Keep: health polling loop, ActivationFailed/Failed detection, deactivation on failure

## Acceptance criteria

- [x] No `az containerapp ingress traffic set` in deploy job
- [x] Deploy job succeeds when revision reaches Running state
- [x] Job fails clearly if revision enters ActivationFailed or Failed state
- [x] No reference to revision traffic weights
