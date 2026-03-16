---
name: Docker Vite restart after new files
description: When new frontend source files are added via git (cherry-pick, merge, etc.), restart the frontend Docker container before running e2e tests
type: feedback
---

## Problem

When new frontend files are added to `frontend/src/` via git operations (cherry-pick, merge, rebase), the Vite dev server running inside the Docker container does NOT automatically discover them. The container's module graph is stale from before the files existed.

Symptoms:
- The new component IS on disk (docker exec confirms files exist)
- The importing file (e.g. `contentRegistry.tsx`) also reflects the change
- But the renderer falls back to the FreeText/raw-textarea mode, as if the new component is missing
- e2e tests fail because the new `data-testid` from the new component is not found

## Fix

Restart the frontend container after adding new source files via git:

```powershell
docker compose restart frontend
```

Then verify it's ready:
```powershell
docker compose logs frontend --tail=20
```

Wait for `VITE vX.X.X  ready in NNN ms` before running tests.

## When to apply

Always do this after:
- `git cherry-pick` that adds new frontend component files
- `git merge` or `git rebase` that brings in new files
- Manually creating new files in `frontend/src/` if the container has been running for a while

Normal file edits (modifying existing files) are picked up live via the volume mount — only NEW files require a restart.
