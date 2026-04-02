# Task 392: Set up Claude in Chrome Extension for Frontend Dev Loop

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/392

## Goal
Document the Chrome extension setup and usage guidance so future frontend tasks use it automatically.

## Acceptance Criteria
- [x] AC#1: Extension installed and verified (done by user)
- [ ] AC#2: `docs/dev-workflow.md` documents setup and when to use it
- [ ] AC#3: `CLAUDE.md` references Chrome extension for frontend tasks
- [ ] AC#4: (covered by the PR + this task being the first to note usage)

## Changes

### `docs/dev-workflow.md`
Add a "Chrome Extension for Frontend Development" section after the "Worktree Setup" section (currently line 178).

Content:
- How to activate: launch Claude Code with `claude --chrome`, verify extension is running in Chrome/Edge
- The extension shares the browser session so Auth0-authenticated pages work without extra setup
- Use during active UI implementation to get visual feedback before handing back to the developer
- Does NOT replace Playwright e2e tests (correctness in CI) or the `review-ui` agent (structured visual QA before push)
- Not a CI concern: only available when running Claude Code CLI interactively on the developer's machine

### `.claude/CLAUDE.md`
Add a bullet after the `area:frontend` serialization rule (line 65):
- When implementing frontend UI, use `claude --chrome` if available to get live visual feedback.
- Pairs with the `review-ui` agent (which runs before push regardless).

## Scope
Docs-only. No code changes. No e2e tests needed. No build checks needed.
