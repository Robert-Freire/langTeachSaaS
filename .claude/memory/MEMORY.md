# Memory Index

## Reminders
- [Pending reminders](reminders.md) — surface due items at /pm start

## Project
- [LangTeach overview](project_langteach_overview.md) — stack, phases, key files
- [Task status](project_langteach_task_status.md) — live tracker + history (script-parsed; don't change format)
- [GitHub label taxonomy](project_langteach_github_labels.md)
- [Plan file locations](project_langteach_plans.md)
- [Dev conventions](project_langteach_dev_conventions.md) — local setup, ports, Auth0, Playwright
- [Design system decisions](project_langteach_design_system.md)
- [Demo audience](project_langteach_demo_audience.md) — Jordi = first customer (not PM); demos = QA checkpoints
- [Task management](project_langteach_task_management.md) — issue workflow, QA agent
- [Flaky e2e tests](project_flaky_tests_analysis.md) — registration+content-view fail on fresh DB
- [Jordi feedback log](project_jordi_feedback_log.md) — roadmap-mapped
- [Teacher B feedback](project_unnamed_teacher_feedback.md) — gamification
- [Deploy freeze](project_deploy_freeze.md) — freeze = skip merge-sprint-to-main
- [Dev workflow doc](project_dev_workflow_doc.md) — docs/dev-workflow.md; sync on CLAUDE.md changes
- [Sprint overviews](project_sprint_overviews.md) — PM-only: sequence, story files, milestone map

## Feedback
- [No autonomous Azure destructive ops](feedback_azure_destructive_ops.md) — give command, don't run
- [Project memory discipline](feedback_project_memory_discipline.md) — update task status memory after every task
- [Trust memory selectively](feedback_no_redundant_file_reads.md) — verify GitHub issue state live; don't trust memory snapshots
- [E2E coverage required](feedback_e2e_coverage_requirement.md) — every feature needs e2e happy path
- [Docker Vite restart](feedback_docker_vite_restart.md) — restart frontend after merge adds files
- [Frontend unit tests](feedback_frontend_unit_tests.md) — Vitest+RTL+msw for modified components/hooks
- [Email/feedback pipeline](feedback_email_and_feedback_pipeline.md) — check, save, log, issue, reply via SMTP
- [Batch related issues](feedback_issue_batching.md)
- [Verify project board after sprint prep](feedback_verify_project_board.md)
- [Self-assign via gh CLI only](feedback_self_assign_issues.md) — `gh issue edit <N> --add-assignee "@me"`; MCP picks wrong account
- [Reply with understanding before acting](feedback_reply_before_acting.md) — summary+planned, wait 4 days
- [Report observations not acted upon](feedback_report_noted_not_acted.md)
- [Update dev-workflow.md on workflow changes](feedback_update_dev_workflow_doc.md)
- [Prefer GitHub MCP over gh CLI](feedback_prefer_github_mcp.md) — use search_issues for milestone filtering
- [Milestone search quoting](feedback_github_search_milestone_quoting.md) — `milestone:*slug*` for multi-word
- [Worktree CWD discipline](feedback_worktree_cwd_discipline.md) — use worktree paths, never main repo absolute
- [Sprint creation updates](feedback_sprint_creation_updates.md) — update overviews/PM skill/task status
- [Verify issues after creation](feedback_verify_issues_after_creation.md) — wrong milestone = invisible to bots
- [Epic management](feedback_epic_management.md) — close epics on split; flat issues
- [Process changes go to agents/rules first](feedback_process_change_priority.md) — memory doesn't change behavior
- [Sophy on hardcoded rules](feedback_sophy_hardcoded_rules.md) — call Sophy when PromptService gets if/switch on language/level/template
- [Never defer without an issue](feedback_never_defer_without_issue.md)
- [No local frontend dev](feedback_no_local_frontend_dev.md) — Docker only
- [Vera screen review procedure](feedback_vera_screen_review_procedure.md) — Chrome+Stitch+code+behavior+feedback2+issues
- [Stop on infra gaps](feedback_stop_on_infra_gaps.md) — ask user; don't invent frontend workarounds
- [Review findings → issues](feedback_review_findings_must_be_issues.md) — file before sprint close
- [Task status format is script-parsed](feedback_task_status_format_stability.md)
- [State sprint branch at merge green light](feedback_sprint_merge_branch_name.md)
- [Issue creation discipline](feedback_issue_creation_discipline.md) — all decisions/labels set; checklist in issue-management.md
- [QA-ready label discipline](feedback_qa_ready_label.md)

## Reference
- [Screen behavior docs (Vera)](reference_screen_behavior_docs.md) — `plan/langteach-beta/scenarios-by-screen.vera/`
- [UI redesign feedback 2](reference_ui_redesign_feedback2.md) — `plan/ui-redesign-feedback2.md`; #763 #764 created
- [Azure resources (dev)](reference_azure_resources.md) — vault `kv-lt-dev-5ba22u`, RG `rg-langteach-dev`
- [Token usage tracking](reference_token_usage_tracking.md) — `~/.claude/logs/usage-log.jsonl`
- [Audio transcription](reference_audio_transcription.md) — Whisper + ffmpeg
- [Gmail bot access](reference_gmail_bot_access.md) — IMAP/SMTP for robert.freire.bot@gmail.com
- [Agent transcripts](reference_agent_transcripts.md) — subagent JSONL logs
- [Teacher B (Philologist)](reference_teacher_b_philologist.md) — files, audio naming
- [Backlog files](reference_backlog_files.md) — code-review/ui-review/observed-issues
- [Sophy — software architect](reference_sophy_architect.md) — data models, drift review
- [Vera — UX designer](reference_vera_ux_designer.md) — /vera skill; screen review, interaction design
- Agent name shorthand: Isaac = pedagogy-reviewer, Arch = architecture-reviewer (use these names in issues/reports)
- [Student field guide](reference_student_field_guide.md) — `docs/student-profile-field-guide.md` is source of truth
