# Task 616: Dev Deploy Hotfixes

**Issue:** Robert-Freire/langTeachSaaS#616
**Branch strategy:** Hotfix from `main`, PR to `main` (per CLAUDE.md hotfix rule).
**Scope:** Two small, unrelated dev-deploy bugs bundled into one hotfix to avoid PR overhead.

## Context

Both fixes address regressions hitting the dev environment:

1. `merge-sprint-to-main` pushes main using `GITHUB_TOKEN`; GitHub's anti-recursion rule suppresses `push`-triggered `backend.yml` and `frontend.yml` runs, so dev stays on the previous image after every sprint merge.
2. `TelegramCard` falls back to `@LangTeachBot`, but the real bot is `@langteach13_bot`. When `VITE_TELEGRAM_BOT_HANDLE` is unset in the SWA env, users see the wrong handle and cannot connect.

## Fix 1: Trigger Backend/Frontend CI after sprint merge

**File:** `.github/workflows/merge-sprint-to-main.yml`

Add two steps to the `merge` job after the existing `Push main` step (currently line 112-113):

```yaml
      - name: Trigger Backend CI/CD on main
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh workflow run backend.yml --ref main

      - name: Trigger Frontend CI/CD on main
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh workflow run frontend.yml --ref main
```

**Why `workflow_dispatch` is allowed from `GITHUB_TOKEN`:** the anti-recursion rule only blocks `push`/`create`/`pull_request` events; `workflow_dispatch` events are explicitly allowed. No new secrets, no PAT, no GitHub App needed.

**`permissions:` block:** already declares `contents: write`. `gh workflow run` over `workflow_dispatch` requires `actions: write`. Need to add that.

Update:
```yaml
permissions:
  contents: write
  actions: write
```

**No other changes to this file.** Alternatives (PAT in checkout, GitHub App) were considered and rejected in the issue.

## Fix 2: Correct TelegramCard bot handle default

**File:** `frontend/src/components/settings/TelegramCard.tsx`

Line 12, change default:

```ts
const BOT_HANDLE = import.meta.env.VITE_TELEGRAM_BOT_HANDLE ?? '@langteach13_bot'
```

**File:** `frontend/src/components/settings/TelegramCard.test.tsx`

Line 44 asserts `expect(screen.getByText(/@LangTeachBot/)).toBeInTheDocument()`. Update to `@langteach13_bot`:

```ts
expect(screen.getByText(/@langteach13_bot/)).toBeInTheDocument()
```

**SWA config (not a code change):** Robert will set `VITE_TELEGRAM_BOT_HANDLE=@langteach13_bot` in the dev SWA env outside this PR. The PR description must include the PowerShell command and call this out as a manual follow-up.

## Files touched

- `.github/workflows/merge-sprint-to-main.yml` (2 new steps, 1 permission line)
- `frontend/src/components/settings/TelegramCard.tsx` (1 line)
- `frontend/src/components/settings/TelegramCard.test.tsx` (1 line)
- `e2e/tests/telegram-connect.spec.ts` (line 179: same `@LangTeachBot` fallback; must match to keep the e2e assertion consistent with the card render when the stack does not set `VITE_TELEGRAM_BOT_HANDLE`)
- `frontend/.env.local.example` (line 5: documentation consistency; developer reference)

Total: 5 files, trivial diff.

## Testing plan

**Fix 1 (workflow):** Cannot functionally test until the next sprint merge. Validation:
- YAML syntax: implicit via workflow parsing on push.
- Logic: the two added steps only call `gh workflow run <name> --ref main`, no state mutation beyond dispatching.
- Post-merge acceptance: verify on the next sprint close that Backend CI/CD and Frontend CI/CD runs start automatically within seconds of the merge commit landing on main.

**Fix 2 (Telegram default):**
- `frontend/src/components/settings/TelegramCard.test.tsx` existing test "shows code and instructions after clicking Connect Telegram" already asserts the default handle string. Update the assertion and the test still covers the fallback path.
- Run `npm test -- TelegramCard` inside the worktree to confirm the updated test passes.
- `review-ui` agent: navigate to Settings page (Teacher role), screenshot the Telegram card. The env var is not set in the e2e stack, so the fallback `@langteach13_bot` should render.

## Acceptance criteria mapping

- [x] AC1 "Backend CI starts automatically" → Fix 1, workflow step 1
- [x] AC2 "Frontend CI starts automatically" → Fix 1, workflow step 2
- [ ] AC3 "next sprint close deploys dev automatically" → validated post-merge on next sprint, not in this PR
- [x] AC4 "TelegramCard fallback = @langteach13_bot; test updated" → Fix 2
- [ ] AC5 "SWA has VITE_TELEGRAM_BOT_HANDLE set" → manual step for Robert, command in PR description

## Risk / rollback

- Fix 1: if `gh workflow run` fails (e.g., permissions bug), the `merge` job fails AFTER pushing main. Main already has the merge commit; only the dispatch fails. Robert can manually dispatch and rerun. Rollback = revert the PR.
- Fix 2: trivial string change, no runtime risk. Rollback = revert the PR.

## Reviewers required

- `qa-verify` — acceptance criteria coverage
- `review` — code review
- `architecture-reviewer` — workflow change
- `review-ui` — `area:frontend` applies to Fix 2 (Settings page, Telegram card render)

Not required: Sophy (no hardcoded pedagogy rules), Isaac (no lesson content), prompt-health (no prompt changes).

## PowerShell command for Robert (include in PR description)

```powershell
az staticwebapp appsettings set --name <dev-swa-name> --setting-names VITE_TELEGRAM_BOT_HANDLE=@langteach13_bot
```

(Robert will need to fill the SWA name and re-deploy or wait for the next frontend build to pick it up.)
