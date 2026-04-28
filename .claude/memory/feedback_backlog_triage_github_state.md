---
name: Backlog triage — always verify GitHub state before surfacing items
description: When reviewing backlog files (observed-issues.md, ui-review-backlog.md, code-review-backlog.md) for sprint planning, always check live GitHub state before flagging any item as actionable
type: feedback
---

Always verify live GitHub issue state before surfacing a backlog item as open or actionable.

**Why:** observed-issues.md, ui-review-backlog.md, and code-review-backlog.md are logs of when something was noticed, not live trackers. An issue can be logged there and be closed days later. Treating log entries as live state causes sprint planning to include already-done or already-tracked work, wasting the user's time and eroding trust in the PM process.

**How to apply:** During any backlog review (sprint planning, triage, or PM session), batch-check the GitHub state of every issue number mentioned before presenting recommendations:

```bash
gh issue view <N> --json number,state,milestone,title --jq '"\(.number) \(.state) [\(.milestone.title // "no milestone")] \(.title)"'
```

Only flag an item as actionable if it is OPEN and either has no milestone or has a milestone matching the current sprint. Never rely on backlog log files alone as source of truth for issue status. GitHub Issues is the single source of truth.
