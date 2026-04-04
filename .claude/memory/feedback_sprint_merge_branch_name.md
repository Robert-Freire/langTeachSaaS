---
name: Always state sprint branch name when giving merge green light
description: When clearing a sprint for merge-to-main, always explicitly state the sprint branch name (e.g. sprint/post-class-tracking) since Robert must enter it manually in the GitHub Action
type: feedback
---

When giving the green light to trigger the merge-sprint-to-main GitHub Action, always explicitly state the full sprint branch name (e.g. `sprint/post-class-tracking`).

**Why:** Robert must manually enter the branch name in the GitHub Action input field. If it's not stated clearly at the moment of approval, he has to look it up.

**How to apply:** In the final "ready to merge" message, include a line like: "Trigger the merge action with branch: `sprint/post-class-tracking`"
