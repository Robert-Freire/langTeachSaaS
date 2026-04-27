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
- [Backlog triage GitHub state](feedback_backlog_triage_github_state.md) — always verify live GitHub state before surfacing backlog items; log files are not live trackers
- [Azure destructive ops](feedback_azure_destructive_ops.md) — give command, don't run
- [Docker frontend workflow](feedback_docker_frontend.md) — Docker only, restart after every change (Vite HMR broken on Windows)
- [E2E coverage required](feedback_e2e_coverage_requirement.md) — every feature needs e2e happy path
- [Feedback intake pipeline](feedback_pipeline.md) — save raw, reply with summary, wait 4 days, then create issues
- [Findings become issues](feedback_findings_become_issues.md) — every deferral/finding gets a GitHub issue immediately
- [Frontend unit tests](feedback_frontend_unit_tests.md) — Vitest+RTL+msw for modified components/hooks
- [GitHub interaction quirks](feedback_github_interaction.md) — MCP default; search_issues with wildcards; gh CLI for @me
- [Issue discipline](feedback_issue_discipline.md) — all decisions/labels at creation; batching; epics; board verification
- [Memory hygiene](feedback_memory_hygiene.md) — trust slow facts, verify volatile state; preserve script-parsed format
- [Process changes](feedback_process_changes.md) — agents/rules first, then sync dev-workflow.md
- [Report observations not acted upon](feedback_report_noted_not_acted.md)
- [Sprint operations](feedback_sprint_operations.md) — three-place updates, board verification, branch name on merge
- [Stop on infra gaps](feedback_stop_on_infra_gaps.md) — ask user; don't invent frontend workarounds
- [Worktree CWD discipline](feedback_worktree_cwd_discipline.md) — use worktree paths, never main repo absolute

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
