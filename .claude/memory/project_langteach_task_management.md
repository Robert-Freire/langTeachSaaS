---
name: LangTeach task management — GitHub Issues as source of truth
description: All tasks tracked in GitHub Issues/Projects; plan files are design docs not task trackers; QA reviewer agent validates issue quality and pre-PR verification
type: project
---

## Single Source of Truth: GitHub Issues (decided 2026-03-19)

**GitHub Issues is the only task tracker.** Plan files remain as design documents (the why and how), but task status, priority, and assignment live in GitHub.

### Why
- One place to check "what's next" (not cross-referencing plan files, memory, and GitHub)
- PRs link to issues automatically (Closes #N)
- Labels and milestones give prioritization without custom systems
- GitHub Projects board gives kanban view for PM visibility
- AI agents can read/write issues via `gh` CLI

### Issue Creation Checklist
When creating a new issue via `gh issue create`, always complete these steps:
1. Create the issue with `--title`, `--label`, `--milestone`, `--body` (or `--body-file`)
2. **Add to GitHub Project board** (this is NOT automatic):
   ```
   item_id=$(gh project item-add 2 --owner Robert-Freire --url "<issue_url>" --format json | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
   ```
3. **Set the project status** (typically "Ready" for qa:ready issues, "Backlog" otherwise):
   ```
   gh project item-edit --project-id PVT_kwHOAF1Pks4BSLsS --id "$item_id" --field-id PVTSSF_lAHOAF1Pks4BSLsSzg_ysiA --single-select-option-id <status_id>
   ```
   Status option IDs: Backlog=7cba4571, Ready=eec9fa45, In Progress=47fc9ee4, Ready to Test=530fcec2, Done=61f69a4c
4. **Set the T-shirt size** on the project item (required — no size = not qa:ready):
   ```
   gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input: { projectId: "PVT_kwHOAF1Pks4BSLsS" itemId: "<item_id>" fieldId: "PVTSSF_lAHOAF1Pks4BSLsSzg_7HpU" value: { singleSelectOptionId: "<size_id>" } }) { projectV2Item { id } } }'
   ```
   Size field ID: `PVTSSF_lAHOAF1Pks4BSLsSzg_7HpU`
   Size option IDs: XS=e261fbf6, S=6736aa38, M=5cfbe0a8, L=e072ac0f, XL=2115c351

### Project Board: Roadmap (#2)

Single board for all issues across all milestones. The **"Current milestone"** view (filtered by the active sprint's milestone) is the primary sprint-at-a-glance screen.

- **Adding issues:** Use `./scripts/add-to-board.sh <url> <status>` to add and set status
- **Sprint view:** Robert updates the "Current milestone" view filter in the GitHub UI at sprint start
- The milestone view shows both open and closed issues, so `Closes #N` in PRs is fine

### Project Board — Always Use `--limit 100`

`gh project item-list` defaults to 30 items. The board has 100+ items, so issues are silently omitted without `--limit 100`. Always use:
```
gh project item-list 2 --owner Robert-Freire --format json --limit 100
```

### Agent Workflow
1. Check GitHub Issues for highest-priority unassigned issue in current milestone
2. Assign itself, create worktree branch
3. Read acceptance criteria, implement
4. QA agent verifies all criteria met (Checkpoint 2)
5. Review agent checks code quality
6. Both pass, PR opens, CodeRabbit reviews
7. Issue auto-closes when PR merges

### QA Reviewer Agent (two checkpoints)

**Checkpoint 1 — Issue Quality Gate (before work starts):**
- Every acceptance criterion must be verifiable
- Edge cases covered (empty states, errors, mobile)
- E2e test scenario obvious from criteria
- **T-shirt size must be set on the project item** (XS/S/M/L/XL) — check via GraphQL or project board. No size = automatic FAIL, do not apply qa:ready.
- Agent approves or sends back for revision

**Checkpoint 2 — Pre-PR Verification (before pushing):**
- Reads issue acceptance criteria
- Checks each criterion has corresponding code/tests/behavior
- Runs e2e and unit tests
- Gives PASS/FAIL with specifics

### Historical Tasks
Completed tasks (T1-T21, etc.) stay in plan files and git history. Not migrated to GitHub Issues.
