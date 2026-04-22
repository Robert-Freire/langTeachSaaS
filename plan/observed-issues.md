# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
| #838 | 2026-04-22 | low | LogSession: checkboxes in Teaching Todos/Followups left panel use native input instead of design-system custom controls (pre-existing) |
| #838 | 2026-04-22 | low | LogSession: local ToggleSwitch focus ring uses ring-indigo-500 instead of ring-indigo-600 (pre-existing, design-system 11.5) |
| #837 | 2026-04-22 | low | TeachingTodosCard.tsx has local relativeTime duplicating formatDate.ts — filed #860 |
| #837 | 2026-04-22 | low | StudentRoster.tsx has local formatRelativeDate not yet refactored to use relativeTime — filed #861 |

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into: #833 (bug batch), #834 (seeder gaps), #835 (e2e session-log rewrite), #836 (ScenarioSeeder Hans B1), #837 (deduplication), #838 (session title from web UI), #839 (debug log privacy), #840 (Edit Student UX), #841 (stale closure + LogSession pre-populate). Already-tracked entries removed (referenced #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657). Dismissed entries removed (defensive-only, intentional, or resolved).*
