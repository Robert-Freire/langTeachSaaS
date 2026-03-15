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

**Reply to every top-level comment without exception** — including minor/declined ones.

Reason: the user reads PR comments to understand what happened. An unanswered comment is indistinguishable from an unseen one. Even a one-line "acknowledged, no change needed because X" gives the user the full picture without having to ask.

## Process (must follow in order)

1. Fetch ALL top-level comments: `gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate | python3 -c "import sys,json; [print(c['id'], c['path']) for c in json.load(sys.stdin) if 'in_reply_to_id' not in c or not c['in_reply_to_id']]"`
2. For each comment, decide: fix, acknowledge, or decline.
3. Post a reply to **every single one** before moving on.
4. Never assume "I'll come back to the minor ones" — do them all in the same pass.
