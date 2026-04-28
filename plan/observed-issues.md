# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into: #833 (bug batch), #834 (seeder gaps), #835 (e2e session-log rewrite), #836 (ScenarioSeeder Hans B1), #837 (deduplication), #838 (session title from web UI), #839 (debug log privacy), #840 (Edit Student UX), #841 (stale closure + LogSession pre-populate). Already-tracked entries removed (referenced #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657). Dismissed entries removed (defensive-only, intentional, or resolved).*

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. Batched into: #989 (DS polish), #990 (code hardening), #991 (e2e fixes), #992 (navigation UX), #993 (infra). Already-tracked entries deleted (#874, #860, #861, #869, #870, #871, #880 already had issues). Dismissed and cosmetic entries deleted (intentional patterns, pre-existing with no risk escalation). Smoke-test dismissed entries removed.*

| #994-sophy | 2026-04-27 | low | Voice-flow state machine duplicated across Students.tsx and StudentDetail.tsx — failure state already diverged (Students returns to 'recording', StudentDetail returns to 'idle'). Extract useVoiceExtractionFlow hook. |
| #994-sophy | 2026-04-27 | low | voiceUpdateMerge.ts: case-insensitive dedup pattern repeated 5× (nativeLanguages, spokenLanguages, interests, objectives, difficulties). Extract mergeUnique helper. |
| #994-sophy | 2026-04-27 | low | extractionNormalizer.ts: 30-entry multi-language alias table is config-in-code. Move to data/ or tighten prompt to return canonical English values. |
| #994-security | 2026-04-27 | low | POST /api/students/extract-profile has no per-user rate limit — any authenticated teacher can fire it in a tight loop. Add sliding-window policy or propagate ClaudeRateLimitException as 429. |
