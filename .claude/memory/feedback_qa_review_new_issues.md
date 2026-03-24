---
name: Run QA review on newly created issues
description: Every time a new issue is added to the backlog, run the /qa skill on it before moving on
type: feedback
---

When creating new GitHub issues (whether from backlogs, feedback, incidents, or any other source), always run the `/qa` skill on them before considering the work done. This ensures every issue meets the quality bar (problem statement, acceptance criteria, labels, size) from the start, rather than discovering gaps when an agent tries to pick it up.

This applies to individual issues and batch creation alike. If creating multiple issues at once, batch the QA review at the end.
