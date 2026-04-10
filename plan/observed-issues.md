# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
| #626 | 2026-04-10 | medium | DemoSeeder uses PersonalNotes as seed-detection marker; if teacher edits that field the seeder loses track and may create duplicates. Pre-existing pattern (was Notes before this PR). Should use a dedicated IsDemo flag or deterministic seed name matching. |
| #627 | 2026-04-10 | low | CodeRabbit suggested validating sourceSessionLogId/coveredInSessionLogId against DB. Dismissed: issue spec explicitly chose soft-backlink (stored UUID, no FK), Sophy approved. If referential integrity becomes a requirement, it can be added later. |

*Cleared 2026-04-08 during Adaptive Replanning sprint close. Actionable entries batched into #603 (DemoSeeder difficulties), #604 (StudentForm partial rows), #605 (VoiceNote MaxLength + AudioRecorder), #606 (exercises block cap), #607 (ExcelImporter date validation), #608 (trend thresholds config), #609 (e2e test hygiene). Remaining entries deleted (acceptable limitations, pre-existing patterns, or covered by previously filed issues).*
