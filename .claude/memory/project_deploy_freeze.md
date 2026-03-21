---
name: Azure deploy freeze mechanism
description: DEPLOY_FROZEN repo variable controls Azure deployments; currently UNFROZEN as of 2026-03-21
type: project
---

## Mechanism

GitHub repo variable `DEPLOY_FROZEN` controls whether the deploy jobs run in backend.yml and frontend.yml. CI (build, test) always runs.

- **Freeze:** `gh variable set DEPLOY_FROZEN --body "true"`
- **Unfreeze:** `gh variable delete DEPLOY_FROZEN`
- **Check:** `gh variable list`

## Current State

**UNFROZEN** as of 2026-03-21. Deployments to Azure are active.

Update this memory when the freeze is lifted.
