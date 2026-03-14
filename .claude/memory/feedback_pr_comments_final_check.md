---
name: Always verify no open PR comments before declaring done
description: Never say all PR comments are resolved without fetching the full comment list at that moment and confirming every comment has a reply
type: feedback
---

Before declaring a PR fully reviewed/resolved:

1. Fetch ALL current comments: `gh api repos/{owner}/{repo}/pulls/{pr}/comments`
2. Identify any comment from coderabbitai[bot] (or others) that has no reply from `robertfreirebot-stack`
3. Only then confirm everything is addressed

Reason: CodeRabbit posts new comments after each push. Checking a snapshot from before the latest push will miss them. Never assume a previous check is still valid after new commits are pushed.
