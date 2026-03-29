---
name: Never run frontend dev server locally
description: Frontend must only run inside Docker; never start Vite or npm run dev on the host machine
type: feedback
---

Never run `npm run dev`, `npx vite`, or any local Vite dev server for the frontend. The frontend runs exclusively inside Docker via `docker compose up`. Running locally causes port 5173 conflicts with the Docker container and fails with missing dependency errors (e.g., @dnd-kit) because `node_modules` is only installed inside the container image, not on the host.

If the frontend needs restarting, use `docker compose restart frontend` or `docker compose up -d --build frontend`.
