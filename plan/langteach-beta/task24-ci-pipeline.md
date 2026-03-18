# T24: CI Pipeline Improvements

## Context

The current GitHub Actions workflows have gaps: the frontend CI job runs only `npm run build` (no lint, no tests), and there are no e2e tests in CI at all. This task adds fast checks to the PR flow and a nightly full-stack e2e run against main (skipping if no changes since last successful run).

## Changes

### 1. Add lint + unit tests to frontend PR workflow

**File:** `.github/workflows/frontend.yml`

Insert two steps in the `ci` job between "Install" (line 27) and "Build" (line 30):

```yaml
- name: Lint
  run: npm run lint
  working-directory: frontend

- name: Test
  run: npm test
  working-directory: frontend
```

No extra env vars or dependencies needed. Adds ~20s to CI.

### 2. Create nightly e2e workflow

**New file:** `.github/workflows/nightly-e2e.yml`

**Triggers:** `schedule` (cron `17 3 * * *`, 3:17 AM UTC) + `workflow_dispatch` (manual, always runs regardless of changes)

**Job 1: `check-changes`** (skip if no new commits on main)
- Use GitHub API to get the last successful run of this workflow and its HEAD SHA
- Compare against current `github.sha`
- If identical AND trigger is `schedule` (not manual), skip the e2e job
- Output: `should_run` = true/false

**Job 2: `e2e`** (depends on check-changes, conditional on `should_run == 'true'`)
- `runs-on: ubuntu-latest`, `timeout-minutes: 30`

Steps:
1. Checkout + setup Node 20 (cache `e2e/package-lock.json`)
2. `npm ci` in `e2e/`
3. `npx playwright install --with-deps chromium` (only chromium, saves ~2 min)
4. **Create `frontend/.env.local` from secrets** (MUST happen before docker compose):
   ```
   VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE, VITE_API_URL=http://localhost:5000
   ```
5. `docker compose up -d --build` (no `--wait`, only sqlserver has a healthcheck)
6. Wait for services with curl loops:
   - sqlserver: `timeout 120 bash -c 'until ...; do sleep 2; done'` (via sqlcmd or TCP check on 1434)
   - API: curl-wait on port 5000 (accept any HTTP status 2xx/4xx as "running")
   - Frontend: curl-wait on port 5173
7. `npx playwright test --reporter=html` with env vars:
   - `PLAYWRIGHT_BASE_URL=http://localhost:5173`
   - `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`
   - `--workers=auto` (GitHub runners have 2 cores; auto-detect is safer than hardcoded 8)
8. On failure: upload `e2e/playwright-report/` as artifact (7-day retention)
9. Always: `docker compose down -v`

### 3. No backend workflow changes

Backend CI already runs `dotnet build` + `dotnet test`. No additional changes needed.

## Secrets required (user must add manually)

| Secret | Used by | Already in repo? |
|--------|---------|------------------|
| SA_PASSWORD | Nightly | No |
| AUTH0_DOMAIN | Nightly | No |
| AUTH0_AUDIENCE | Nightly | No |
| CLAUDE_API_KEY | Nightly | No |
| E2E_TEST_EMAIL | Nightly | No |
| E2E_TEST_PASSWORD | Nightly | No |
| VITE_AUTH0_DOMAIN | Nightly + Frontend CI | Yes |
| VITE_AUTH0_CLIENT_ID | Nightly + Frontend CI | Yes |
| VITE_AUTH0_AUDIENCE | Nightly + Frontend CI | Yes |

## Implementation checkpoint

**Before pushing the branch**, stop and ask the user to confirm all GitHub secrets are created. Do NOT push until confirmation is received.

## Secret setup instructions (for the user)

Go to **GitHub repo > Settings > Secrets and variables > Actions > New repository secret** and create each one:

| Secret | Value / where to find it |
|--------|--------------------------|
| `SA_PASSWORD` | Same as local `.env` `SA_PASSWORD`. Source: 1Password, item "LangTeach Docker SA" |
| `AUTH0_DOMAIN` | `langteach-dev.eu.auth0.com` (same as local `.env`) |
| `AUTH0_AUDIENCE` | `https://api.langteach.io` (same as local `.env`) |
| `CLAUDE_API_KEY` | Your Anthropic API key (`sk-ant-...`). Source: 1Password under "LangTeach Dev" or Anthropic console |
| `E2E_TEST_EMAIL` | Same as local `e2e/.env` `E2E_TEST_EMAIL` (the test teacher email registered in Auth0 dev tenant) |
| `E2E_TEST_PASSWORD` | Same as local `e2e/.env` `E2E_TEST_PASSWORD` (password for the test teacher account) |
| `VITE_AUTH0_DOMAIN` | `langteach-dev.eu.auth0.com` (should already exist from frontend deploy workflow) |
| `VITE_AUTH0_CLIENT_ID` | SPA Client ID from Auth0 dev tenant (should already exist from frontend deploy workflow) |
| `VITE_AUTH0_AUDIENCE` | `https://api.langteach.io` (should already exist from frontend deploy workflow) |

**Secrets that should already exist** (from existing frontend/backend deploy workflows): `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_URL`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_STATIC_WEB_APPS_API_TOKEN`. Verify these are present; only create the new ones.

### Auth0 test user setup

The real-auth tests (`registration`, `provider-switch`, `auth-me`) log in through Auth0's Universal Login page. They need a real user in the Auth0 dev tenant. If you already run e2e tests locally, you already have this user (check `e2e/.env`). If not, create one:

1. Go to **Auth0 Dashboard > User Management > Users > Create User**
2. **Email:** a dedicated address like `e2e-nightly@langteach.io` (or any email you control)
3. **Password:** a strong password (this goes into the `E2E_TEST_PASSWORD` secret)
4. **Connection:** `Username-Password-Authentication`
5. After creation, click the user > toggle **Email Verified** to `true` (or click "Send Verification Email" and verify it)
6. No further setup needed. The app auto-registers a Teacher record when this user first calls `/api/auth/me`. The `registration.spec.ts` test handles its own teacher lifecycle.

Use this user's email and password as the `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` GitHub secrets.

## Key design decisions

- **Mock-auth tests still need full stack**: they mock Auth0 tokens but call the real backend API. All e2e tests require docker-compose (sqlserver + api + frontend).
- **Skip unchanged nightlies**: a `check-changes` job compares HEAD SHA against last successful run. Saves CI minutes and reduces noise from flaky tests. Manual triggers (`workflow_dispatch`) always run.
- **Chromium only**: Playwright config doesn't specify browsers, defaults to chromium. Installing only chromium saves ~2 min vs all browsers.
- **`--reporter=html`**: needed for the artifact upload to produce a browsable report.
- **`--workers=auto`**: overrides the config's 8 workers since GitHub runners only have 2 cores.

## Files to modify/create

- `.github/workflows/frontend.yml` (add 2 steps to existing `ci` job)
- `.github/workflows/nightly-e2e.yml` (new file)

## Verification

1. Push a frontend change to a PR branch, confirm Lint and Test steps appear and pass in GitHub Actions
2. Introduce an intentional lint error, push, confirm CI fails at the Lint step
3. After merging, trigger nightly manually via Actions > "Nightly E2E Tests" > "Run workflow"
4. Verify: docker-compose starts, Playwright runs, HTML report uploads on failure
5. Trigger again immediately (manual), verify it runs (manual always runs)
6. Wait for next scheduled trigger with no new commits, verify it skips
7. Check job duration target: under 15 min
