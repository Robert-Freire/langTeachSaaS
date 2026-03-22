---
name: Deploy freeze mechanism
description: Deploy freeze works by not triggering the merge-sprint-to-main GitHub Action; DEPLOY_FROZEN variable kept as secondary guard on deploy jobs
type: project
---

## Mechanism

Two layers of deploy control:

1. **Primary (sprint branch workflow):** Agents merge to the sprint branch. Main only advances when Robert triggers the `merge-sprint-to-main` GitHub Action. Freeze = don't trigger the action. Sprint branch keeps receiving work, main and Azure stay stable.

2. **Secondary (legacy, still active):** GitHub repo variable `DEPLOY_FROZEN` on backend.yml and frontend.yml deploy jobs. CI always runs regardless.
   - Freeze: `gh variable set DEPLOY_FROZEN --body "true"`
   - Unfreeze: `gh variable delete DEPLOY_FROZEN`
   - Check: `gh variable list`

## Current State

**UNFROZEN** as of 2026-03-22. Sprint branch workflow is now the primary freeze mechanism.
