---
name: Never defer without a GitHub issue
description: Every deferred finding must have a tracked issue; if not tracked it's lost. When user accepts a deferral, create the issue immediately.
type: feedback
---

**Rule:** Never say something is "deferred" or "can be done later" without a GitHub issue tracking it. If it's not in GitHub, it's lost.

**Workflow:**
1. When analysis produces findings that won't be fixed now, propose the defer with a target milestone.
2. If the user accepts the deferral, immediately create the issue(s) in the target milestone.
3. Reference the new issue number when reporting the deferral, so traceability is explicit.
4. Never list deferred items only in plan files, backlogs, or conversation without a corresponding GitHub issue.

**Why:** GitHub Issues is the single source of truth. Backlogs and plan files are supplementary. If a finding only exists in a conversation summary or a backlog file, it will be forgotten.
