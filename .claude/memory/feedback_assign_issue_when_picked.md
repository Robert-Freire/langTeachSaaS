---
name: Assign issue when picking a task
description: When starting work on a GitHub issue, immediately self-assign it so other agents don't pick the same task
type: feedback
---

When picking a task from the GitHub issue list:

1. Only consider issues with no assignee — skip any that already have one assigned
2. Immediately self-assign the chosen issue before doing any other work:
   ```
   gh issue edit <number> --add-assignee "@me"
   ```

Do this before entering a worktree or writing a plan. This prevents parallel agents from picking the same task.
