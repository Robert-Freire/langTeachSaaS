# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
| #848 | 2026-04-22 | low | session-log-voice.spec.ts tests at lines 34-85, 118-151, 232-272 still reference session-log-dialog/submit-session-log (old modal path removed in prior sprint); not updated in #835 e2e rewrite; pre-existing failure |
| #848 | 2026-04-22 | low | Issue #848 AC requested visible STATUS label above Cancelled toggle; design-system.md 11.3 prohibits this; AC was fulfilled via invisible spacer for alignment instead |
| #838 | 2026-04-22 | low | LogSession: checkboxes in Teaching Todos/Followups left panel use native input instead of design-system custom controls (pre-existing) |
| #838 | 2026-04-22 | low | LogSession: local ToggleSwitch focus ring uses ring-indigo-500 instead of ring-indigo-600 (pre-existing, design-system 11.5) |
| #837 | 2026-04-22 | low | TeachingTodosCard.tsx has local relativeTime duplicating formatDate.ts — filed #860 |
| #844 | 2026-04-22 | low | TeachingTodoDto projection duplicated in StudentService.ToTodo() and DashboardService inline LINQ (EF Core constraint) — filed #869 |
| #844 | 2026-04-22 | low | TeacherFollowup.Kind has no DB CHECK constraint; only DTO regex guards API path — filed #870 |
| #837 | 2026-04-22 | low | StudentRoster.tsx has local formatRelativeDate not yet refactored to use relativeTime — filed #861 |
| #852 | 2026-04-22 | low | StudentsController (4x) and CoursesController still use ValidationProblem/BadRequest(rawString) for ValidationException — filed #871 |

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into: #833 (bug batch), #834 (seeder gaps), #835 (e2e session-log rewrite), #836 (ScenarioSeeder Hans B1), #837 (deduplication), #838 (session title from web UI), #839 (debug log privacy), #840 (Edit Student UX), #841 (stale closure + LogSession pre-populate). Already-tracked entries removed (referenced #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657). Dismissed entries removed (defensive-only, intentional, or resolved).*
