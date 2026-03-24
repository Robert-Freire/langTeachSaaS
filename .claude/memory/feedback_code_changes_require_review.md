---
name: All code/config changes require PR review
description: Never commit code, config, or install changes directly to main or sprint branches; everything must go through a reviewed PR
type: feedback
---

Never merge or push directly to main or the sprint branch if the change includes:
- Code changes (any source file)
- Config changes (docker-compose, bicep, CI workflows, env files, package.json)
- Package installations or dependency changes

All of these must go through a worktree, PR, and code review. No exceptions.

The only things that can be pushed directly are non-code files: memory, docs, plans, skills.

Reason: Robert found changes merged without review that he didn't approve (e.g., a container created just to install an MCP). The review step catches unnecessary complexity and scope creep.
