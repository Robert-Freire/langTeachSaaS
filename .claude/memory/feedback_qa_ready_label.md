---
name: Never pre-add qa:ready label
description: Do not add qa:ready to issues before running the qa-ready agent — the agent checks more than just issue completeness
type: feedback
---

Never add the `qa:ready` label when creating issues, even if the issue seems well-defined. Always run the `qa-ready` agent first and let it add the label.

**Why:** The qa-ready agent checks more things than just whether the issue has enough detail — it verifies acceptance criteria format, visual coverage, test traceability, and other criteria that aren't obvious from reading the issue body. Pre-adding the label bypasses these checks and gives a false signal to bots picking up the issue.

**How to apply:** When creating new issues: create them with no `qa:ready` label, then immediately run the `qa-ready` agent to evaluate them. Only after the agent confirms PASS should `qa:ready` be present.
