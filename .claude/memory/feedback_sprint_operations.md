---
name: Sprint operations checklist
description: When creating/closing milestones, update overviews + PM skill + task status. Verify board after sprint prep. State sprint branch name when giving merge green light.
type: feedback
originSessionId: 16259888-ac9c-4212-80e1-8b4865a397c7
---
## When a sprint/milestone is created or status changes
Update three places in the same operation:
1. `.claude/memory/project_sprint_overviews.md` — add/update the sequence table
2. `.claude/skills/pm/SKILL.md` — story file path if active sprint changed
3. `.claude/memory/project_langteach_task_status.md` — milestone list

Also write a sprint story file at `plan/sprints/<slug>.md` for any new active sprint, following `student-aware-curriculum.md` style: teacher perspective, what they can do after the sprint, grounded in reality.

## Verify board after sprint prep
After updating priorities, qa:ready, and milestone assignments, verify the project board state before declaring ready:
1. `gh project item-list 2 --owner Robert-Freire --format json`
2. Every sprint issue is present and in correct status column (Ready, not Backlog or No Status)
3. Deferred/non-sprint items are NOT in Ready
4. Priority labels on items match what was set on the issues

Don't trust that `gh issue edit` or `gh project item-add` worked. Verify final state.

## State sprint branch name when greenlighting merge
When clearing a sprint for merge-to-main, always state the full sprint branch name (e.g. `sprint/post-class-tracking`). Robert must enter it manually in the GitHub Action input field. Include a line in the final ready-to-merge message: "Trigger the merge action with branch: `sprint/post-class-tracking`"
