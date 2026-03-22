---
name: CodeRabbit requires manual trigger on sprint branch PRs
description: CodeRabbit only auto-reviews PRs targeting main; for sprint branch PRs, post @coderabbitai review as a PR comment
type: feedback
---

CodeRabbit is configured to only auto-review PRs targeting `main`. Since we now target the sprint branch, CodeRabbit skips the review.

After opening a PR against the sprint branch, immediately post a comment with `@coderabbitai review` to trigger the review manually. The CodeRabbit monitoring cron (step 8 in the Task Completion Protocol) then works as normal.
