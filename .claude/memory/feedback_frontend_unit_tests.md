---
name: Frontend unit test requirement
description: Any frontend component or hook that is modified must have a corresponding unit test added or updated
type: feedback
---

## Rule

When modifying a frontend component or hook, add or update unit tests covering the changed behavior. This applies even when e2e tests exist.

## Why

E2e tests cover happy-path flows but miss component-level logic bugs (e.g., stale prop vs local state, markdown fence stripping, badge visibility logic). Several bugs in ContentBlock and ConversationRenderer went undetected because there were no unit tests for those components.

## Where tests live

`frontend/src/` alongside the source file, or in a `__tests__/` subfolder if there are many. Pattern: `ComponentName.test.tsx` or `hookName.test.ts`.

## Stack

Vitest + React Testing Library + msw (for API mocking). Setup file: `frontend/src/test/setup.ts`.

## Scope

- New component or hook → write tests for all new behaviors
- Modified component or hook → add tests covering the changed behavior at minimum
- Shared components (e.g., ContentBlock) that affect multiple features → prioritize testing the shared logic

## What NOT to test

- Pure UI layout (snapshot tests are brittle)
- Third-party library behavior
- Already-covered e2e happy paths (don't duplicate)
