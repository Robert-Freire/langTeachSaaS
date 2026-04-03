---
name: Task status memory format is parsed by scripts
description: Scripts parse project_langteach_task_status.md with regex. Do not change the format without updating the scripts.
type: feedback
---

`project_langteach_task_status.md` is read by `.claude/scripts/task-pick.py` (and potentially other scripts). The script extracts the sprint branch and active milestone using regex.

Two formats are supported (both must keep working):
- Sprint branch: `**Active sprint branch:** \`sprint/<slug>\`` 
- Milestone: table row `| Name | ACTIVE | notes |`

**Why:** On 2026-04-03, rewriting the memory file from a list format to a table format broke `task-pick.py` because the regex no longer matched.

**How to apply:** When updating the task status memory, preserve the existing format. If you need to change the structure, grep for scripts that read the file first (`grep -r "project_langteach_task_status" .claude/scripts/`) and update their parsers in the same change.
