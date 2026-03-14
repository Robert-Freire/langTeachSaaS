---
name: No redundant file reads when memory is sufficient
description: Do not read backend/code files before writing a plan if memory and plan.md already describe the current state
type: feedback
---

When task/project memory already describes what exists in the codebase (e.g., "AppDbContext is empty", "Program.cs registers EF"), do not re-read those files before writing a plan or task document. Trust memory. Only read source files when the task requires modifying them or when memory is genuinely incomplete.
