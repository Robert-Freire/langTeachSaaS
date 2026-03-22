---
name: Deploy freeze mechanism
description: Deploy freeze = don't trigger the merge-sprint-to-main GitHub Action; no variables or flags needed
type: project
---

## Mechanism

Deploy freeze is simple: Robert does not trigger the `merge-sprint-to-main` GitHub Action. The sprint branch keeps receiving work, main stays stable, Azure stays on the last good state.

Unfreeze = Robert triggers the merge action when ready.

No config variables, no special flags. The `DEPLOY_FROZEN` repo variable was removed as part of the sprint branch workflow migration.

## Current State

**UNFROZEN** as of 2026-03-22. Sprint branch workflow is the freeze mechanism.
