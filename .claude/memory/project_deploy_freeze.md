---
name: Azure deploy freeze mechanism
description: DEPLOY_FROZEN repo variable controls Azure deployments; currently FROZEN as of 2026-03-20
type: project
---

## Mechanism

GitHub repo variable `DEPLOY_FROZEN` controls whether the deploy jobs run in backend.yml and frontend.yml. CI (build, test) always runs.

- **Freeze:** `gh variable set DEPLOY_FROZEN --body "true"`
- **Unfreeze:** `gh variable delete DEPLOY_FROZEN`
- **Check:** `gh variable list`

## Current State

**FROZEN** as of 2026-03-20. PRs can merge, CI runs, but nothing deploys to Azure.

Update this memory when the freeze is lifted.
