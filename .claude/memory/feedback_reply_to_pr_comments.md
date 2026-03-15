---
name: Reply to PR comments when fixing them
description: Whenever fixing a code issue raised in a PR review comment, always post a reply to that specific comment explaining what was fixed and in which commit
type: feedback
---

When addressing PR review comments (CodeRabbit or otherwise):

- Reply to **each comment individually** using its own API call — never batch replies into a single PR-level comment.
- If the comment requires a code change: fix the code, push the commit, then reply to that specific comment referencing the commit SHA and explaining what was changed and why.
- If the comment requires no code change (already fixed, deferred, or not a problem): reply immediately to that specific comment explaining the reasoning.
- After replying, **resolve the thread** using the GraphQL mutation:
  1. Find the thread node ID: `gh api graphql -f query='{ repository(owner: "...", name: "...") { pullRequest(number: N) { reviewThreads(first: 50) { nodes { id isResolved comments(first: 1) { nodes { databaseId } } } } } } }'`
  2. Resolve it: `gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "PRRT_..."}) { thread { isResolved } } }'`

Reply API endpoint: `gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies -X POST --field body="..."`

Reply to every comment — never leave one unanswered. Never batch replies.
