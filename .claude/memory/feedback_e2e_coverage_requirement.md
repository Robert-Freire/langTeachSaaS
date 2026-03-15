---
name: E2E coverage requirement for main functionalities
description: Every main functionality must have an e2e test; this must be planned at task start, not added later
type: feedback
---

## Rule

At the start of planning any task, ask: **does this task create or modify a main functionality?**

If yes, the plan must include an e2e test for the happy path. The test must be written and run (not just planned) before the PR is opened.

## Why

CI is a future goal. E2E coverage needs to be built incrementally from the start — retrofitting tests later is much harder and leaves gaps that block CI adoption.

## What counts as a main functionality

- Any user-facing flow (registration, login, CRUD operations, key UI interactions)
- Any API endpoint that the frontend actually calls
- Any background process that affects user data (seeders, migrations, etc.)

## How to plan it

When writing the task plan:
1. List the happy path(s) for the feature
2. For each happy path, define what the e2e test will assert
3. Include the e2e test as an explicit step in the plan, not an afterthought
4. If the test requires DB setup/teardown, use `db-helper.ts` (mssql direct connection)
5. If the test requires a new Auth0 user, flag it early — it may need Management API credentials

## What already exists

- `auth-helper.ts` — creates an authenticated browser context (logs in as E2E_TEST_EMAIL)
- `db-helper.ts` — direct SQL Server access for test setup/teardown
- Existing specs: auth-diagnostic, auth-me, registration, teacher-profile, students, lessons, dashboard
