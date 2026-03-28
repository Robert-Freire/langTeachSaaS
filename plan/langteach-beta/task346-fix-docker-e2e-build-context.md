# Task 346: Fix Docker e2e Build Context to Include data/ Directory

**Issue:** #346
**Branch:** worktree-task-t346-fix-docker-e2e-build-context
**Sprint:** sprint/student-aware-curriculum

## Problem

The pedagogy config sprint embedded JSON files from `data/` as EmbeddedResources in
`backend/LangTeach.Api/LangTeach.Api.csproj` using relative paths `..\..\data\...`. When
`dotnet build` runs locally, the working directory is `backend/LangTeach.Api/`, so the path
resolves correctly. But both `docker-compose.e2e.yml` and `docker-compose.yml` set the API
build context to `./backend`, meaning `data/` (at repo root) is invisible to the Docker build.
Result: `dotnet publish` cannot find the embedded resource files and the API image fails to build.

Volume mounts won't fix this because embedded resources are compiled into the DLL at build time
(not loaded from disk at runtime). The only correct fix is to widen the build context.

## Approach: Widen API Build Context to Repo Root

Change the API service `context:` from `./backend` to `.` in both compose files. Update the
Dockerfile COPY paths to be relative to the new repo-root context. Create a root `.dockerignore`
to avoid sending large irrelevant directories (frontend, e2e, node_modules) to the Docker daemon.

The EmbeddedResource paths in the csproj (`..\..\data\...`) resolve correctly with the new
context: the project file is at `/src/backend/LangTeach.Api/`, so `../../data/` = `/src/data/`,
which is exactly where we COPY `data/` to.

## Files to Change

### 1. `backend/LangTeach.Api/Dockerfile`

Current (context = `./backend`):
```dockerfile
WORKDIR /src
COPY LangTeach.Api/*.csproj LangTeach.Api/
RUN dotnet restore LangTeach.Api/LangTeach.Api.csproj
COPY LangTeach.Api/ LangTeach.Api/
RUN dotnet publish LangTeach.Api/LangTeach.Api.csproj -c Release -o /app
```

New (context = `.` repo root):
```dockerfile
WORKDIR /src
COPY backend/LangTeach.Api/*.csproj backend/LangTeach.Api/
RUN dotnet restore backend/LangTeach.Api/LangTeach.Api.csproj
COPY backend/LangTeach.Api/ backend/LangTeach.Api/
COPY data/ data/
RUN dotnet publish backend/LangTeach.Api/LangTeach.Api.csproj -c Release -o /app
```

### 2. `docker-compose.e2e.yml`

Change API service build:
```yaml
    build:
      context: .
      dockerfile: backend/LangTeach.Api/Dockerfile
```

### 3. `docker-compose.yml`

Change API service build:
```yaml
    build:
      context: .
      dockerfile: backend/LangTeach.Api/Dockerfile
```

### 4. `.dockerignore` (new file at repo root)

Docker uses the `.dockerignore` from the build context root. Currently `backend/.dockerignore`
covers `./backend` context builds; it won't be used once context is `.`. Create a root
`.dockerignore` that excludes large irrelevant directories:

```
.git
**/bin
**/obj
**/node_modules
frontend/
e2e/
.claude/
plan/
docs/
data/curricula/
```

Note: `data/curricula/` is excluded (not needed by the API build; curricula are loaded via
separate EmbeddedResource entries already in the .csproj). Wait - actually the csproj DOES
include `data/curricula/instituto_educativo/*.json` as EmbeddedResources, so we must NOT
exclude `data/curricula/`. Remove that entry.

Corrected `.dockerignore`:
```
.git
**/bin
**/obj
**/node_modules
frontend/
e2e/
.claude/
plan/
docs/
```

## Acceptance Criteria Check

- `docker compose -f docker-compose.e2e.yml --env-file .env.e2e up --build` succeeds (build
  can reach `data/` for embedded resources)
- Backend container loads all pedagogy JSON files (they're embedded in the DLL, so this is
  implicit in a successful build)
- Dev stack (`docker-compose.yml`) also builds successfully with the same context change
- Pre-push checks pass (dotnet build, dotnet test run natively and are not affected)

## No Test Changes Needed

This is a pure infrastructure change. All backend tests run natively (not in Docker) so
pre-push checks pass already. The acceptance criteria are verified by a successful Docker build.
