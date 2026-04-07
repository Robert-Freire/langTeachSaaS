# Task 503: Fix Azurite Health Check for E2E Material Upload

## Problem

`e2e/tests/material-upload.spec.ts` is excluded from the nightly `parallel` project because the API container can call `CreateIfNotExistsAsync()` before Azurite is ready to accept connections. The `api` depends on `azurite: condition: service_started` (container running), not a readiness check.

## Fix

### 1. `docker-compose.yml`

Add a health check to the `azurite` service that verifies the blob port (10000) is accepting TCP connections. Change the `api` depends_on for azurite from `service_started` to `service_healthy`.

Azurite image is Node/Alpine-based (node:22-alpine). Alpine does NOT ship nc by default; use wget (available via busybox):
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -q --spider http://localhost:10000/devstoreaccount1 2>/dev/null || exit 1"]
  interval: 5s
  timeout: 3s
  retries: 10
  start_period: 5s
```

### 2. `e2e/playwright.config.ts`

Remove `'**/material-upload.spec.ts'` from the `parallel` project's `testIgnore` list.

## Acceptance Criteria

- [ ] `azurite` has a health check in `docker-compose.yml`
- [ ] `api` depends on `azurite: condition: service_healthy`
- [ ] `material-upload.spec.ts` is removed from `testIgnore` in the `parallel` project
- [ ] No new GitHub secrets required
