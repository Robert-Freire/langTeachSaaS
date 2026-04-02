---
name: No parallel background agents
description: Background agent notifications are unreliable; run all agents sequentially in foreground
type: feedback
---

Background agent completion notifications are unreliable on this setup. Agents launched with `run_in_background: true` complete successfully but the main session never receives the notification, leading to "No task found" errors and wasted re-runs.

Rule: never use `run_in_background: true` for review or task agents. Run them sequentially in the foreground.

Confirmed via investigation of task #273 session (2026-03-30): all 3 review agents (review, architecture-reviewer, sophy) completed in 1-2 minutes with valid output, but the main session never got notified, tried TaskOutput (wrong tool), failed, and relaunched replacements.
