# Hardening Sprint — Recommended Pick Order

**Principle:** unblock the dev workflow first, fix backend bugs that don't touch shared surfaces, then do the foundational refactors, then the polish, and put the rebrand last so it lands on a stable codebase. Frontend tasks must run sequentially (Docker port 5173 conflict).

---

## Wave 1 — Unblockers (do these first)

These actively bite us today. Until they're fixed we can't trust review-ui, the visual stack, or the build script.

| # | Issue | Area | Why first |
|---|-------|------|-----------|
| 1D | **#1083** db-helper hardcoded teacher email | e2e/infra | All Atelier visual specs fail at seed today; tiny diff, unblocks every review-ui run downstream |
| 2D | **#1059** e2e port 5000 conflict | infra/e2e | Visual stack smoke tests broken; pair with #1083 |
| 3D | **#1080** review-ui-sprint hallucinated 4/6 findings | infra/tooling | Restores trust in the sprint-close UI agent before next sprint close |
| 4D | **#1084** task-build-verify.py bicep path | infra | Worktree builds currently fail at bicep step; small |

## Wave 2 — Production safety

| # | Issue | Area | Why next |
|---|-------|------|----------|
| 5D | **#1048** BACPAC backup failed | infra | Production data safety; don't carry an open backup-failure ticket through the sprint |
| 6D | **#888** Nightly E2E failure tracker audit | e2e | Clears 7 dated noise issues in one pass; either fixes nightly or proves it's stale |

## Wave 3 — Backend-only bug fixes (parallelizable with frontend waves)

These don't touch the frontend so they can run alongside any frontend task without the port conflict.

| # | Issue | Area | Notes |
|---|-------|------|-------|
| 7D | **#36** Settings HTML sanitization | backend (with tiny FE) | qa:ready since earlier sprints; small |
| 8W | **#421** coerceExercisesContent hardening | backend (FE coerce util) | unit-test only, browser waiver granted |
| 9W| **#610** trueFalse sourcePassage guard | backend prompt | prompt-side fix, decision locked |
| 10 | **#611** dedup weakness blocks in lesson plan prompt | backend prompt | discrete prompt cleanup |

## Wave 4 — Foundational frontend refactors (sequential, frontend port lock)

Do these BEFORE the polish and the rebrand so we don't refactor twice.

| # | Issue | Area | Why this order |
|---|-------|------|----------------|
| 11 | **#1082** CEFR canonicalization | backend + frontend + AI | Foundational. Touches prompts, validators, UI badges, seed data. Other refactors will depend on the canonical source |
| 12 | **#1066** dedup and config-extraction sweep | backend + frontend + AI | Pulls voiceUpdateMerge, extractionNormalizer, useVoiceExtractionFlow, prompt cleanups into one pass |
| 13 | **#1071** extract useMicRecorder hook + canonicalize lt-gradient-primary | frontend | Small, do after #1066 lands so the hook extraction patterns line up |
| 14 | **#1067** standalone hardening batch | frontend + backend + e2e | rate limit, AbortController, color sweep, nav pattern. Item 3 already deferred to #1083 |

## Wave 5 — Atelier polish (frontend, sequential)

Land after Wave 4 so polish doesn't redo work the refactor would have done anyway.

| # | Issue | Area | Notes |
|---|-------|------|-------|
| 15 | **#1065** extraction intent leakage (todo spawns ghost newSession) | frontend + AI | discrete bug |
| 16 | **#1072** extraction polish (countryOfResidence, preamble, sanitization) | frontend + backend + AI | discrete polish batch |
| 17 | **#1076** SessionSummaryHeader cleanup + whatWasCovered tightening | frontend + backend | decide wire-or-delete |

## Wave 6 — Design system canonicalization

Lands AFTER Atelier polish so the patterns we document are the ones we just stabilized.

| # | Issue | Area | Notes |
|---|-------|------|-------|
| 18 | **#1064** Vera DS canonicalization for Atelier patterns | frontend + design | Documents FAB, ProposalCard, NewStudentFields in design-system.md |

## Wave 7 — Rebrand (LAST)

Touches every user-visible string. Do it on a stable codebase so it doesn't fight every other PR for merge conflicts.

| # | Issue | Area | Notes |
|---|-------|------|-------|
| 19 | **#1078** LangTeach -> Atelier rebrand | frontend + design | The only teacher-visible deliverable of the sprint. Land it last and clean. |

---

## Pick order summary (one column)

```
Wave 1: #1083, #1059, #1080, #1084
Wave 2: #1048, #888
Wave 3: #36, #421, #610, #611       (backend, can run alongside FE waves)
Wave 4: #1082, #1066, #1071, #1067  (frontend, sequential)
Wave 5: #1065, #1072, #1076          (frontend, sequential)
Wave 6: #1064                        (frontend)
Wave 7: #1078                        (frontend, rebrand, LAST)
```

## Why this order, in one paragraph

If we pick the rebrand first we'll be merging hundreds of string changes through every other PR. If we pick the polish first we'll redo the same files when the refactor lands. If we ignore the unblockers, every review-ui run for the rest of the sprint will fail at seed and we'll think it's our fault. So: dev-stack first, production safety second, backend bug fixes whenever a backend agent is free, refactors before polish, design-system docs after the patterns settle, rebrand last.

## Constraint reminders

- At most ONE `area:frontend` task in flight (Docker port 5173 conflict). Backend tasks can run in parallel with the active frontend task.
- All tasks are already `qa:ready` — pick straight from this list, no gating.
- After each task merges, the next ready frontend slot opens.
