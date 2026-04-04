# Memory Index

## Reminders
- [Pending reminders](..\..\..\..\..\ws\PersonalOS\03_Workspace\langTeachSaaS\.claude\memory\reminders.md) — check at /pm start; surface due items

## Project
- [LangTeach SaaS overview](project_langteach_overview.md) — stack, phases, key files
- [Task status and next steps](project_langteach_task_status.md) — live tracker + history
- [GitHub label taxonomy](project_langteach_github_labels.md) — label system reference
- [Plan file locations](project_langteach_plans.md) — where to find each plan document
- [Dev workflow conventions](project_langteach_dev_conventions.md) — local setup, ports, Auth0, Playwright
- [Design system decisions](project_langteach_design_system.md) — components, colors, layout
- [Demo strategy and audience](project_langteach_demo_audience.md) — Jordi is first customer not PM; demos as QA checkpoints
- [Task management](project_langteach_task_management.md) — issue workflow, QA agent
- [Flaky e2e test analysis](project_flaky_tests_analysis.md) — registration+content-view tests fail on fresh DB (Auth0, AI format)
- [Jordi feedback log](project_jordi_feedback_log.md) — Jordi feedback, roadmap-mapped
- [Unnamed teacher feedback](project_unnamed_teacher_feedback.md) — Teacher B feedback: gamification
- [Deploy freeze mechanism](project_deploy_freeze.md) — freeze = skip merge-sprint-to-main action
- [Dev workflow overview](project_dev_workflow_doc.md) — full dev loop at docs/dev-workflow.md; sync on CLAUDE.md changes
- [Sprint overview files](project_sprint_overviews.md) — PM-only: sprint sequence, story files, milestone map

## Feedback
- [No autonomous Azure destructive operations](feedback_azure_destructive_ops.md) — never run az delete/remove; provide command for user to run
- [Project memory discipline](feedback_project_memory_discipline.md) — update task status memory after every task
- [Trust memory selectively](feedback_no_redundant_file_reads.md) — trust memory for stable facts; verify volatile state in source files
- [E2E coverage requirement](feedback_e2e_coverage_requirement.md) — every feature needs e2e happy path; plan at task start
- [Docker Vite restart after new files](feedback_docker_vite_restart.md) — after git merge adds frontend files, restart docker frontend
- [Frontend unit test requirement](feedback_frontend_unit_tests.md) — modified components/hooks need unit test; Vitest+RTL+msw
- [Email and feedback pipeline](feedback_email_and_feedback_pipeline.md) — email pipeline: check, save, log, issue, reply via SMTP
- [Batch related issues](feedback_issue_batching.md) — group related fixes into one issue
- [Verify project board after sprint prep](feedback_verify_project_board.md) — verify board matches expectations after sprint prep
- [Self-assign issues via gh CLI only](feedback_self_assign_issues.md) — always use `gh issue edit <N> --add-assignee "@me"`, never MCP tool
- [Reply with understanding before acting](feedback_reply_before_acting.md) — reply with summary+planned issues, wait 4 days before creating
- [Report observations not acted upon](feedback_report_noted_not_acted.md) — list deferred items at end of every summary
- [Update dev-workflow.md on workflow changes](feedback_update_dev_workflow_doc.md) — CLAUDE.md/agent/skill changes must update docs/dev-workflow.md
- [Prefer GitHub MCP over gh CLI](feedback_prefer_github_mcp.md) — use mcp__github__* tools; search_issues for milestone filtering
- [GitHub search milestone quoting](feedback_github_search_milestone_quoting.md) — use `milestone:*slug*` for multi-word milestone names
- [Worktree CWD discipline](feedback_worktree_cwd_discipline.md) — use worktree paths, never main repo absolute path
- [Update sprint references on creation](feedback_sprint_creation_updates.md) — on milestone create/close: update sprint overviews, PM skill, task status
- [Verify issues after creation](feedback_verify_issues_after_creation.md) — verify milestone+board visibility after creating issues; wrong milestone = invisible to bots
- [Epic management policy](feedback_epic_management.md) — close epics immediately when split; use flat issues
- [Process changes go to agents/rules first](feedback_process_change_priority.md) — update agents/CLAUDE.md before memory; memory doesn't change behavior
- [Sophy reviews hardcoded rules](feedback_sophy_hardcoded_rules.md) — call Sophy on PRs with hardcoded if/switch on language/level/template in PromptService
- [Never defer without a GitHub issue](feedback_never_defer_without_issue.md) — every deferral needs a GitHub issue immediately
- [Never run frontend locally](feedback_no_local_frontend_dev.md) — frontend in Docker only; never start Vite on host
- [No parallel background agents](feedback_background_agent_polling.md) — notifications unreliable; run all agents sequentially in foreground
- [Stop on infrastructure gaps](feedback_stop_on_infra_gaps.md) — if backend can't fulfill an AC, stop and ask; don't invent frontend workarounds
- [Review findings must become issues](feedback_review_findings_must_be_issues.md) — file GitHub issues for all sprint-close findings before closing
- [Task status format is script-parsed](feedback_task_status_format_stability.md) — don't change memory format without updating scripts that parse it
- [State sprint branch name at merge green light](feedback_sprint_merge_branch_name.md) — always say the branch name (e.g. sprint/post-class-tracking) when approving merge

## Reference
- [Token usage tracking](reference_token_usage_tracking.md) — check ~/.claude/logs/usage-log.jsonl; snippets in ~/.claude/usage-guide.md
- [Audio transcription method](reference_audio_transcription.md) — local transcription: Whisper + ffmpeg
- [Gmail bot account access](reference_gmail_bot_access.md) — IMAP/SMTP for robert.freire.bot@gmail.com; use curl
- [Agent transcript location](reference_agent_transcripts.md) — subagent JSONL logs location
- [Teacher B — Anonymous Philologist](reference_teacher_b_philologist.md) — Teacher B: file locations, audio naming
- [Backlog files](reference_backlog_files.md) — code-review, ui-review, observed-issues backlogs
- [Pedagogy reviewer: Isaac](reference_pedagogy_reviewer_isaac.md) — pedagogy-reviewer agent = Isaac
- [Software architect: Sophy](reference_sophy_architect.md) — architect agent: data models, drift review
- [Architecture reviewer: Arch](reference_arch_reviewer.md) — architecture-reviewer agent = Arch
