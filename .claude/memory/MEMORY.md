# Memory Index

## Project
- [LangTeach SaaS overview](project_langteach_overview.md) — stack, phases, monetization, key files
- [Task status and next steps](project_langteach_task_status.md) — T10-T15 done, T15.1 next, typed content model tasks added
- [Plan file locations](project_langteach_plans.md) — where to find each plan document
- [Dev workflow conventions](project_langteach_dev_conventions.md) — local dev setup, ports, Auth0 tenant, Playwright, logs
- [Design system decisions](project_langteach_design_system.md) — component library, colors, layout rationale, infrastructure notes
- [Demo audience and goals](project_langteach_demo_audience.md) — brother as potential PM, show teacher-to-student loop

## Feedback
- [Task start workflow](feedback_task_branch_workflow.md) — always pull main and create the feature branch before starting any task
- [No autonomous Azure destructive operations](feedback_azure_destructive_ops.md) — never run az delete/remove commands; always provide the command and ask the user to run it manually
- [Project memory discipline](feedback_project_memory_discipline.md) — after every completed task, update task status memory so next session starts with full context; no re-reading requirements/plans from scratch
- [No redundant file reads](feedback_no_redundant_file_reads.md) — do not read source files before writing a plan if memory already describes current state; trust memory
- [Playwright must be run, not just written](feedback_playwright_must_run.md) — execute the e2e test against the running stack before pushing; writing the file is not sufficient
- [PR base branch always main](feedback_pr_base_branch.md) — always target main, even when task depends on another task branch; note the dependency in the PR body instead
- [Reply to PR comments when fixing them](feedback_reply_to_pr_comments.md) — whenever fixing a code issue raised in a review comment, immediately post a reply to that comment with the commit SHA and a brief explanation
- [No PR without verified changes](feedback_no_pr_without_verified_changes.md) — always write tests covering the changed behavior and confirm they pass before opening a PR; a passing build is not sufficient
- [Always verify no open PR comments before declaring done](feedback_pr_comments_final_check.md) — fetch the full comment list after every push before saying all comments are resolved; CodeRabbit posts new comments after each push
- [E2E coverage requirement](feedback_e2e_coverage_requirement.md) — every main functionality needs an e2e happy path test, planned at task start not added later; prerequisite for future CI adoption
