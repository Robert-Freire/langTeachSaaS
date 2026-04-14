---
name: Issue creation discipline
description: Every issue must have all decisions made, correct labels (including size), and no open choices before creation. Follow the checklist in .claude/procedures/issue-management.md.
type: feedback
---

Issues must be fully decided and properly labeled at creation time, not retroactively fixed.

**Why:** Claude creates issues with open decisions ("A or B", "consider X or Y"), missing size labels, and sometimes missing qa:ready. This wastes time on manual cleanup and means implementers hit ambiguity. The user caught this pattern across 14 issues in one session.

**How to apply:**
- Before every `mcp__github__issue_write` call, mentally run the checklist in `.claude/procedures/issue-management.md`.
- Grep your own issue body for "or", "consider", "options", "TBD", "alternatively" before creating. If found, resolve the decision first.
- Always set all four label types at creation: priority, area, size, qa:ready (if PM-session).
- During PM sessions, the PM conversation IS the QA gate. Add qa:ready directly. No need to run the qa-ready agent.
- Outside PM sessions (backlog, triage), run the qa-ready agent.
