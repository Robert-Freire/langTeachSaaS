---
name: Post-plan-mode workflow
description: After exiting plan mode, always save the plan file and run /review-plan before implementing
type: feedback
---

Using `EnterPlanMode` is fine for this project, but after the user approves and plan mode exits, always follow these steps before writing any code:

1. Save the plan to `plan/langteach-beta/task<N>-<description>.md`
2. Run `/review-plan` (Skill tool) with the file path
3. Fix any MAJOR GAPS or NEEDS REVISION findings
4. Only then start implementation

This must happen automatically after plan approval. Never skip straight to coding.

Reason: the user approved plan mode's UX but needs the save-and-review protocol to run every time without having to manually remind.
