# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
| #626 | 2026-04-10 | medium | DemoSeeder uses PersonalNotes as seed-detection marker; if teacher edits that field the seeder loses track and may create duplicates. Pre-existing pattern (was Notes before this PR). Should use a dedicated IsDemo flag or deterministic seed name matching. |
| #627 | 2026-04-10 | low | CodeRabbit suggested validating sourceSessionLogId/coveredInSessionLogId against DB. Dismissed: issue spec explicitly chose soft-backlink (stored UUID, no FK), Sophy approved. If referential integrity becomes a requirement, it can be added later. |
| #636 | 2026-04-10 | low | All controllers use `Auth0Id is null` check instead of `IsNullOrWhiteSpace`, and none wrap `UpsertTeacherAsync` in a try/catch for `InvalidOperationException`. Pre-existing pattern across 16 controllers. Could be addressed in a future controller hardening sweep. |
| #638 | 2026-04-10 | low | NextSessionHero countdown ("IN 35 MIN") is computed once at render time with no interval refresh. Countdown will become stale until the user navigates away and back. Could be improved with a 60-second setInterval in a dedicated hook. |
| #638 | 2026-04-10 | low | Two CEFR badge implementations now exist: legacy getCefrBadgeClasses() (emerald/indigo/purple, pill) and new Stitch CefrBadge component (blue/indigo/warm, square). Deferred unification tracked in #644 — depends on #637 and #639 landing first. |
| #639 | 2026-04-10 | low | StudentProfileOverview.tsx is now dead code (superseded by StudentProfileTab). Should be deleted along with its test file. |
| #639 | 2026-04-10 | low | ui/tabs.tsx (shadcn Tabs component) is no longer imported anywhere. All tab UIs now use custom button-based tabs. Could be removed. |
| #639 | 2026-04-10 | low | toggleDifficultyStatus mutation onError only logs to console with no user-visible feedback. Pre-existing behavior from original StudentDetail. |
| #630 | 2026-04-10 | low | session-history.visual.spec.ts tab locator uses `/history/i` but tab was renamed to "Sessions" in a prior PR. Blocks onboarding visual spec dependency. |
| #653 | 2026-04-11 | medium | difficulty-taxonomy.json `competencies` list should replace Fluency with Interaction + add Mediation per CEFR 2020 Companion Volume; consider adding `critical` severity. Deferred to #657. |
| #653 | 2026-04-11 | low | ReflectionExtractionService.ExtractAsync anchors relative-date resolution to UTC (DateTime.UtcNow). Teachers west/east of UTC could get wrong day around midnight. Pre-existing behavior; needs timezone-aware clock injection. |

*Cleared 2026-04-08 during Adaptive Replanning sprint close. Actionable entries batched into #603 (DemoSeeder difficulties), #604 (StudentForm partial rows), #605 (VoiceNote MaxLength + AudioRecorder), #606 (exercises block cap), #607 (ExcelImporter date validation), #608 (trend thresholds config), #609 (e2e test hygiene). Remaining entries deleted (acceptable limitations, pre-existing patterns, or covered by previously filed issues).*
