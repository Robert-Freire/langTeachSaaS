---
name: LangTeach SaaS — Plan File Locations
description: Where to find each plan document for this project
type: reference
---

## Plan Directory

Plans live in the workspace repo under `plan\`. The Obsidian vault has a junction pointing to the same folder, so both paths resolve to the same files:

- Canonical: `C:\ws\PersonalOS\03_Workspace\langTeachSaaS\plan\`
- Obsidian junction: `C:\ws\PersonalOS\02_Library\personal-obsidian-vault\Projects\langTeachSaaS\plan\` (same files)

## Existing Plans

| Plan | Path |
|------|------|
| Phase 1 — Foundation (T1-T9) | `plan\langteach-phase1\plan.md` |
| Phase 1 — T1 task file | `plan\langteach-phase1\task1-repo-tooling-setup.md` |
| Phase 1 — T2 task file | `plan\langteach-phase1\task2-azure-infra.md` |
| Phase 1 — T3 task file | `plan\langteach-phase1\task3-auth0-integration.md` |
| Phase 1 — T5 task file | `plan\langteach-phase1\task5-teacher-profile.md` |
| Phase 1 — T5.1 task file | `plan\langteach-phase1\task5.1-design-system.md` |
| Phase 1 — T9.1 task file | `plan\langteach-phase1\task9.1-brand-logo.md` |
| Phase 2 — AI Core (old, superseded) | `plan\langteach-phase2\plan.md` |
| Product Vision & Roadmap (all phases) | `plan\langteach-vision.md` |
| Beta — "Show the Magic" (T10-T23, active) | `plan\langteach-beta\plan.md` |
| Beta — T10 task file | `plan\langteach-beta\task10-student-profile-enrichment.md` |
| Beta — First PM Feedback Analysis | `plan\langteach-beta\demo feedback 1\analysis.md` |

## Naming Convention
- Feature subfolder per phase: `plan\langteach-phase1\`, `plan\langteach-beta\`, etc.
- Phase overview: `plan.md` inside the subfolder
- Individual task files: `task<N>-<short-description>.md` in the same subfolder
- Never save plans directly in the root `plan\` folder

## Notes
- The old `langteach-phase2` plan is kept as a technical reference but is superseded by `langteach-beta` for task sequencing
- Beta plan uses global task numbering T10-T23 (not internal T1-T8 like phase2 plan did)
