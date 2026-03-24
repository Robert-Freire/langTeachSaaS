---
name: Update sprint references when creating sprints
description: When creating or closing a milestone, update three places: sprint overviews memory, PM skill story pointer, and task status memory
type: feedback
---

When a new sprint/milestone is created, or an existing one changes status (active, closed, merged):

1. **Sprint overviews** (`.claude/memory/project_sprint_overviews.md`): add or update the sprint in the sequence table
2. **PM skill** (`.claude/skills/pm/SKILL.md`): update the story file path if the active sprint changed
3. **Task status** (`.claude/memory/project_langteach_task_status.md`): update the milestones list

Also write a sprint story file (`plan/sprints/<slug>.md`) for any new active sprint, following the style of `student-aware-curriculum.md`: teacher perspective, what they can do after the sprint, grounded in reality.
