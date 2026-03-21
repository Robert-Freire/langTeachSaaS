# Memory Index

## Project
- [LangTeach SaaS overview](project_langteach_overview.md) — stack, phases, monetization, key files
- [Task status and next steps](project_langteach_task_status.md) — GitHub Issues is live tracker; historical task tables for reference
- [GitHub label taxonomy](project_langteach_github_labels.md) — complete label system with colors, meanings, and usage rules
- [Plan file locations](project_langteach_plans.md) — where to find each plan document
- [Dev workflow conventions](project_langteach_dev_conventions.md) — local dev setup, ports, Auth0 tenant, Playwright, logs
- [Design system decisions](project_langteach_design_system.md) — component library, colors, layout rationale, infrastructure notes
- [Demo strategy and audience](project_langteach_demo_audience.md) — periodic internal demos as QA checkpoints; brother is potential PM but not blocking
- [Task management](project_langteach_task_management.md) — GitHub Issues as single source of truth; QA reviewer agent; agent workflow
- [Flaky e2e test analysis](project_flaky_tests_analysis.md) — registration and typed-content-view tests fail on fresh DB (Auth0 unreachable from Docker, AI response format)
- [Jordi feedback log](project_jordi_feedback_log.md) — running log of all feedback from Jordi (brother/teacher, Head of Discovery), mapped to roadmap, with open questions
- [Unnamed teacher feedback](project_unnamed_teacher_feedback.md) — feedback from Jordi's colleague (name pending), gamification and ludic activities
- [Deploy freeze mechanism](project_deploy_freeze.md) — DEPLOY_FROZEN repo variable controls Azure deploys; check state before unfreeze

## Feedback
- [Task start workflow](feedback_task_branch_workflow.md) — always pull main and create the feature branch before starting any task
- [No autonomous Azure destructive operations](feedback_azure_destructive_ops.md) — never run az delete/remove commands; always provide the command and ask the user to run it manually
- [Project memory discipline](feedback_project_memory_discipline.md) — after every completed task, update task status memory so next session starts with full context; no re-reading requirements/plans from scratch
- [Trust memory selectively](feedback_no_redundant_file_reads.md) — trust memory for stable facts (architecture, completed work); always verify volatile state (next task, new sub-tasks) against source files
- [Playwright must be run, not just written](feedback_playwright_must_run.md) — execute the e2e test against the running stack before pushing; writing the file is not sufficient
- [PR base branch always main](feedback_pr_base_branch.md) — always target main, even when task depends on another task branch; note the dependency in the PR body instead
- [Reply to PR comments when fixing them](feedback_reply_to_pr_comments.md) — whenever fixing a code issue raised in a review comment, immediately post a reply to that comment with the commit SHA and a brief explanation
- [No PR without verified changes](feedback_no_pr_without_verified_changes.md) — always write tests covering the changed behavior and confirm they pass before opening a PR; a passing build is not sufficient
- [Always verify no open PR comments before declaring done](feedback_pr_comments_final_check.md) — fetch the full comment list after every push before saying all comments are resolved; CodeRabbit posts new comments after each push
- [E2E coverage requirement](feedback_e2e_coverage_requirement.md) — every main functionality needs an e2e happy path test, planned at task start not added later; prerequisite for future CI adoption
- [All tests green before push](feedback_all_tests_green_before_push.md) — never push code unless all tests pass (e2e, unit and integration); only exception is non-code files (memory, docs)
- [Docker Vite restart after new files](feedback_docker_vite_restart.md) — after adding new frontend files via git (cherry-pick/merge), restart `docker compose restart frontend` before running e2e tests or Vite won't discover the new modules
- [Frontend unit test requirement](feedback_frontend_unit_tests.md) — any modified frontend component or hook must have a unit test added/updated; Vitest + RTL + msw, tests live next to source files
- [Critically evaluate PR comments](feedback_critically_evaluate_pr_comments.md) — never blindly fix review comments; assess validity against project context before fixing or declining
- [Re-run QA after editing a qa:ready issue](feedback_reqa_after_issue_edit.md) — check no implementation started, re-run QA agent after any body edit on a qa:ready issue
- [Email check and reply workflow](feedback_email_workflow.md) — when asked to check email: read, analyze, incorporate feedback into memory/plans, reply directly via SMTP
- [Always save raw feedback](feedback_save_raw_feedback.md) — on any feedback (email, audio, message), save raw text to feedback/raw/ and update person's feedback log
- [E2E stack coordination](feedback_e2e_stack_coordination.md) — only one e2e stack at a time; check before starting, notify user if busy, never tear down another agent's stack
- [Batch related issues](feedback_issue_batching.md) — group related small fixes into single issues; don't create one issue per finding or one mega-issue for everything
- [Add issues to project board](feedback_add_issues_to_project.md) — always add new issues to the project board immediately after creation; has been forgotten before
- [Verify project board after sprint prep](feedback_verify_project_board.md) — after preparing a sprint, verify the board matches expectations (columns, priorities, all items visible)
- [Assign issue when picked](feedback_assign_issue_when_picked.md) — immediately self-assign the GitHub issue when picking a task, before any other work, so other agents don't pick it

## Reference
- [Audio transcription method](reference_audio_transcription.md) — transcribe audio files locally using OpenAI Whisper + ffmpeg
- [Gmail bot account access](reference_gmail_bot_access.md) — IMAP/SMTP credentials for robert.freire.bot@gmail.com; read and send emails via curl
- [Agent transcript location](reference_agent_transcripts.md) — where to find subagent reasoning logs (JSONL files) to check agent status/progress
- [Teacher B — Anonymous Philologist](reference_teacher_b_philologist.md) — Jordi's colleague, feedback file locations, naming convention for future audio batches
