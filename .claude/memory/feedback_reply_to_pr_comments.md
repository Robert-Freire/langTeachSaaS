---
name: Reply to PR comments when fixing them
description: Whenever fixing a code issue raised in a PR review comment, always post a reply to that specific comment explaining what was fixed and in which commit
type: feedback
---

When addressing PR review comments (CodeRabbit or otherwise):

- If the comment requires a code change: fix the code, push the commit, then reply referencing the commit SHA and explaining what was changed and why.
- If the comment requires no code change (already fixed, deferred, or not a problem): reply immediately explaining the reasoning.

Use the GitHub API endpoint: `gh api repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies -f body="..."`

Reply to every comment — never leave one unanswered.
