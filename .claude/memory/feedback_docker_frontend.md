---
name: Docker frontend workflow
description: Frontend runs only in Docker; restart container after any frontend file change (Vite HMR broken on Windows volume mounts)
type: feedback
originSessionId: 16259888-ac9c-4212-80e1-8b4865a397c7
---
The frontend runs exclusively inside Docker via `docker compose up`. Never run `npm run dev`, `npx vite`, or any local Vite dev server on the host. Port 5173 conflicts with the container, and `node_modules` only exists inside the container image (missing deps on host, e.g. @dnd-kit).

**HMR is broken on Windows volume mounts.** After any frontend file change (new file, edit, git operation), restart the container:

```powershell
docker compose restart frontend
docker compose logs frontend --tail=20
```

Wait for `VITE vX.X.X ready in NNN ms` before testing. Always after: editing any file in `frontend/src/`, adding new files, `git cherry-pick`/`merge`/`rebase` touching frontend.

**Why:** combined fix for two recurring failure modes, host Vite (dep + port conflicts) and silently stale containers (HMR doesn't fire through Windows mounts).
