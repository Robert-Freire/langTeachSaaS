# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into: #833 (bug batch), #834 (seeder gaps), #835 (e2e session-log rewrite), #836 (ScenarioSeeder Hans B1), #837 (deduplication), #838 (session title from web UI), #839 (debug log privacy), #840 (Edit Student UX), #841 (stale closure + LogSession pre-populate). Already-tracked entries removed (referenced #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657). Dismissed entries removed (defensive-only, intentional, or resolved).*

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. Batched into: #989 (DS polish), #990 (code hardening), #991 (e2e fixes), #992 (navigation UX), #993 (infra). Already-tracked entries deleted (#874, #860, #861, #869, #870, #871, #880 already had issues). Dismissed and cosmetic entries deleted (intentional patterns, pre-existing with no risk escalation). Smoke-test dismissed entries removed.*

*Cleared 2026-05-03 during Unified Voice & Chat sprint close. Batched into: #1064 (Vera DS canonicalization — Hardening), #1065 (Atelier extraction intent leakage — Hardening), #1066 (dedup and config-extraction sweep — Hardening), #1067 (standalone hardening batch — Hardening), #1063 (/help broken link — current sprint, merged). Already-filed: #1059 (e2e port 5000) moved to Hardening. Deleted: smoke-test new-student apply 400 (fixed by #1058); #992-arch SessionHistoryTab text-sm (intentional per #992 spec); #1056 useEffect-based state reset pattern (speculative, not investigated, no concrete bug); #1004 STT confidence regions (architectural backend gap, will resurface organically when needed).*
