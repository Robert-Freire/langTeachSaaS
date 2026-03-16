---
name: Docker Vite restart — HMR broken on Windows volume mounts
description: Vite HMR does not work through Docker volume mounts on Windows. Any frontend file change (new or modified) requires a container restart.
type: feedback
---

## Problem

Vite's HMR (hot module replacement) does NOT work through Docker volume mounts on Windows. Neither new files nor edits to existing files are picked up automatically. The container runs stale code until restarted.

## Fix

After ANY frontend file change (new file, edited file, or git operation), restart the container:

```powershell
docker compose restart frontend
```

Then verify it's ready:
```powershell
docker compose logs frontend --tail=20
```

Wait for `VITE vX.X.X  ready in NNN ms` before testing.

## When to apply

Always after:
- Editing any existing file in `frontend/src/`
- Adding new files to `frontend/src/`
- `git cherry-pick`, `git merge`, or `git rebase` that touches frontend files
