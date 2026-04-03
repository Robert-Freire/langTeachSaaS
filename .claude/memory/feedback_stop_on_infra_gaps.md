---
name: Stop on infrastructure gaps
description: When plan review finds the backend/API can't fulfill an acceptance criterion, stop and ask the user instead of inventing workarounds
type: feedback
---

When plan review (or your own investigation) reveals that the existing backend API cannot fulfill an acceptance criterion in the issue, STOP and ask the user. Do not attempt to work around missing backend capabilities from the frontend.

**Why:** During t441 (Session log form), the plan reviewer found that the backend had no endpoint to update the student profile on level reassessment. Instead of flagging this as a blocker, the bot started investigating how to jury-rig the frontend (fetch student, manually update cefrLevel, call updateStudent with full payload). The user had to interrupt manually. The workaround would have been fragile and misplaced logic in the wrong layer.

**How to apply:** After plan review, if any acceptance criterion requires infrastructure that doesn't exist, present the user with options: (a) descope the criterion from this task, (b) create a prerequisite backend issue first, or (c) explicitly approve the workaround. This applies to missing API endpoints, missing fields, unsupported operations, and missing backend business logic. Never silently absorb an infra gap into a frontend workaround.
