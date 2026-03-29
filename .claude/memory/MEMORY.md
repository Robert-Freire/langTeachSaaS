# Memory Index

## Reminders
- [Pending reminders](..\..\..\..\..\ws\PersonalOS\03_Workspace\langTeachSaaS\.claude\memory\reminders.md) — check this file at the start of /pm sessions and when asked; surface anything due

## Project
- [LangTeach SaaS overview](project_langteach_overview.md) — stack, phases, monetization, key files
- [Task status and next steps](project_langteach_task_status.md) — GitHub Issues is live tracker; historical task tables for reference
- [GitHub label taxonomy](project_langteach_github_labels.md) — complete label system with colors, meanings, and usage rules
- [Plan file locations](project_langteach_plans.md) — where to find each plan document
- [Dev workflow conventions](project_langteach_dev_conventions.md) — local dev setup, ports, Auth0 tenant, Playwright, logs
- [Design system decisions](project_langteach_design_system.md) — component library, colors, layout rationale, infrastructure notes
- [Demo strategy and audience](project_langteach_demo_audience.md) — periodic internal demos as QA checkpoints; Jordi is first customer (not PM), we show working software and collect reactions
- [Task management](project_langteach_task_management.md) — GitHub Issues as single source of truth; QA reviewer agent; agent workflow
- [Flaky e2e test analysis](project_flaky_tests_analysis.md) — registration and typed-content-view tests fail on fresh DB (Auth0 unreachable from Docker, AI response format)
- [Jordi feedback log](project_jordi_feedback_log.md) — running log of all feedback from Jordi (brother/teacher, Head of Discovery), mapped to roadmap, with open questions
- [Unnamed teacher feedback](project_unnamed_teacher_feedback.md) — feedback from Jordi's colleague (name pending), gamification and ludic activities
- [Deploy freeze mechanism](project_deploy_freeze.md) — freeze = don't trigger merge-sprint-to-main action; no variables needed
- [Dev workflow overview](project_dev_workflow_doc.md) — human-readable explanation of the full dev loop; lives at docs/dev-workflow.md; keep aligned when CLAUDE.md rules change
- [Sprint overview files](project_sprint_overviews.md) — PM-only: sprint sequence, story files, milestone map; update when sprints are created or change status

## Feedback
- [Task start workflow](feedback_task_branch_workflow.md) — always pull main and create the feature branch before starting any task
- [No autonomous Azure destructive operations](feedback_azure_destructive_ops.md) — never run az delete/remove commands; always provide the command and ask the user to run it manually
- [Project memory discipline](feedback_project_memory_discipline.md) — after every completed task, update task status memory so next session starts with full context; no re-reading requirements/plans from scratch
- [Trust memory selectively](feedback_no_redundant_file_reads.md) — trust memory for stable facts (architecture, completed work); always verify volatile state (next task, new sub-tasks) against source files
- [Playwright must be run, not just written](feedback_playwright_must_run.md) — execute the e2e test against the running stack before pushing; writing the file is not sufficient
- [PR base branch always sprint](feedback_pr_base_branch.md) — always target the active sprint branch, not main; note dependencies in PR body
- [Reply to PR comments when fixing them](feedback_reply_to_pr_comments.md) — whenever fixing a code issue raised in a review comment, immediately post a reply to that comment with the commit SHA and a brief explanation
- [No PR without verified changes](feedback_no_pr_without_verified_changes.md) — always write tests covering the changed behavior and confirm they pass before opening a PR; a passing build is not sufficient
- [Always verify no open PR comments before declaring done](feedback_pr_comments_final_check.md) — fetch the full comment list after every push before saying all comments are resolved; CodeRabbit posts new comments after each push
- [E2E coverage requirement](feedback_e2e_coverage_requirement.md) — every main functionality needs an e2e happy path test, planned at task start not added later; prerequisite for future CI adoption
- [All tests green before push](feedback_all_tests_green_before_push.md) — never push code unless all tests pass (e2e, unit and integration); only exception is non-code files (memory, docs)
- [Docker Vite restart after new files](feedback_docker_vite_restart.md) — after adding new frontend files via git (cherry-pick/merge), restart `docker compose restart frontend` before running e2e tests or Vite won't discover the new modules
- [Frontend unit test requirement](feedback_frontend_unit_tests.md) — any modified frontend component or hook must have a unit test added/updated; Vitest + RTL + msw, tests live next to source files
- [Critically evaluate PR comments](feedback_critically_evaluate_pr_comments.md) — never blindly fix review comments; assess validity against project context before fixing or declining
- [Re-run QA after editing a qa:ready issue](feedback_reqa_after_issue_edit.md)
- [QA agent must read SKILL.md](feedback_qa_agent_use_skill_file.md) — never duplicate QA rules inline; always instruct agent to read .claude/skills/qa/SKILL.md — check no implementation started, re-run QA agent after any body edit on a qa:ready issue
- [Email check and reply workflow](feedback_email_workflow.md) — when asked to check email: read, analyze, incorporate feedback into memory/plans, reply directly via SMTP
- [Always save raw feedback](feedback_save_raw_feedback.md) — on any feedback (email, audio, message), save raw text to feedback/raw/ and update person's feedback log
- [Email processing workflow](feedback_email_processing_workflow.md) — after processing feedback email: save raw, update logs, create/update issues, reply, move to Processed folder
- [E2E stack coordination](feedback_e2e_stack_coordination.md) — only one e2e stack at a time; check before starting, notify user if busy, never tear down another agent's stack
- [Batch related issues](feedback_issue_batching.md) — group related small fixes into single issues; don't create one issue per finding or one mega-issue for everything
- [Add issues to project board](feedback_add_issues_to_project.md) — always add new issues to the project board immediately after creation; has been forgotten before
- [Verify project board after sprint prep](feedback_verify_project_board.md) — after preparing a sprint, verify the board matches expectations (columns, priorities, all items visible)
- [Assign issue when picked](feedback_assign_issue_when_picked.md) — immediately self-assign the GitHub issue when picking a task, before any other work, so other agents don't pick it
- [Self-assign issues via gh CLI only](feedback_self_assign_issues.md) — always use `gh issue edit <N> --add-assignee "@me"`, never MCP tool; MCP has no @me support and assigns to Robert-Freire by mistake
- [Reply with understanding before acting](feedback_reply_before_acting.md) — after receiving feedback, reply with summary + planned issues, wait 4 days for corrections before creating issues
- [Report observations not acted upon](feedback_report_noted_not_acted.md) — at the end of every summary, list things noticed but deferred so nothing silently drops
- [Update dev-workflow.md on workflow changes](feedback_update_dev_workflow_doc.md) — any change to CLAUDE.md, agents, or skills must also update docs/dev-workflow.md
- [CodeRabbit needs manual trigger on sprint PRs](feedback_coderabbit_sprint_branch.md) — post @coderabbitai review comment after opening PRs against the sprint branch
- [Prefer GitHub MCP over gh CLI](feedback_prefer_github_mcp.md) — always use mcp__github__* tools; use search_issues (not list_issues) when filtering by milestone to avoid 12k+ token over-fetches
- [GitHub search milestone quoting](feedback_github_search_milestone_quoting.md) — always use wildcard syntax `milestone:*slug*` for multi-word milestone names; unquoted spaces silently break the query and return 0 results
- [Worktree CWD discipline](feedback_worktree_cwd_discipline.md) — all edits/commands must use worktree paths, never main repo absolute path; agents default to memorized project root
- [All code/config changes require PR review](feedback_code_changes_require_review.md) — never push code, config, or dependency changes directly to main or sprint; must go through worktree + PR + review
- [Update sprint references on creation](feedback_sprint_creation_updates.md) — when creating/closing milestones, update sprint overviews, PM skill story pointer, and task status memory
- [Verify issues after creation](feedback_verify_issues_after_creation.md) — always verify correct milestone AND board visibility after creating issues; never hardcode milestone numbers; issues in wrong milestone are invisible to bots
- [Epic management policy](feedback_epic_management.md) — epics are temporary placeholders; close them immediately when split, never keep open as parent containers; all sprint work through flat independent issues
- [Process changes go to agents/rules first](feedback_process_change_priority.md) — update agent definitions and CLAUDE.md before memory; memory doesn't change bot behavior
- [Never defer without a GitHub issue](feedback_never_defer_without_issue.md) — every deferred finding must have a tracked issue; create immediately when user accepts deferral
- [Never run frontend locally](feedback_no_local_frontend_dev.md) — frontend runs only in Docker; never start Vite/npm dev on the host

## Reference
- [Audio transcription method](reference_audio_transcription.md) — transcribe audio files locally using OpenAI Whisper + ffmpeg
- [Gmail bot account access](reference_gmail_bot_access.md) — IMAP/SMTP credentials for robert.freire.bot@gmail.com; read and send emails via curl
- [Agent transcript location](reference_agent_transcripts.md) — where to find subagent reasoning logs (JSONL files) to check agent status/progress
- [Teacher B — Anonymous Philologist](reference_teacher_b_philologist.md) — Jordi's colleague, feedback file locations, naming convention for future audio batches
- [Backlog files](reference_backlog_files.md) — three backlog files (code-review, ui-review, observed-issues) to check when user says "check backlogs"
