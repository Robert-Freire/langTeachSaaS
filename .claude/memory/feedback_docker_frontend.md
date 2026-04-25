---
name: Docker frontend workflow
description: Frontend runs only in Docker for normal dev; for e2e mock-auth tests run locally via npm run dev:e2e on port 5174
type: feedback
originSessionId: 16259888-ac9c-4212-80e1-8b4865a397c7
---
The frontend runs exclusively inside Docker via `docker compose up` for normal development. Never run `npm run dev` or any local Vite dev server for regular dev work. Port 5173 is the Docker container port.

**HMR works correctly** on WSL Linux filesystem mounts. No container restart needed after frontend file edits.

**For e2e mock-auth tests only:** the mock-auth Playwright project expects the frontend on port 5174 with `VITE_E2E_TEST_MODE=true`. Run the stack as:

```bash
ASPNETCORE_ENVIRONMENT=E2ETesting docker compose up sqlserver api -d
npm run dev:e2e   # from frontend/ directory, binds to port 5174
```

Requires `frontend/.env.e2e` with `VITE_E2E_TEST_MODE=true` (not in repo, must exist locally).

**Why:** normal dev uses Docker frontend (port 5173, HMR works natively on Linux). Mock-auth e2e needs a separate local frontend with the mock Auth0 provider active.
