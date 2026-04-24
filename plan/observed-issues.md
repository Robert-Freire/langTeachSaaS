# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
| #834 | 2026-04-22 | low | EnsureAnaVisualExtrasAsync.UpdatedAt uses DateTime.UtcNow inline instead of caller's now (pre-existing inconsistency, not introduced by this task) |
| #809 | 2026-04-22 | low | languages.json has duplicate concepts: "Mandarin" and "Chinese (Mandarin)" - requires data migration to consolidate; filed #874 |
| #848 | 2026-04-22 | low | session-log-voice.spec.ts tests at lines 34-85, 118-151, 232-272 still reference session-log-dialog/submit-session-log (old modal path removed in prior sprint); not updated in #835 e2e rewrite; pre-existing failure |
| #848 | 2026-04-22 | low | Issue #848 AC requested visible STATUS label above Cancelled toggle; design-system.md 11.3 prohibits this; AC was fulfilled via invisible spacer for alignment instead |
| #838 | 2026-04-22 | low | LogSession: checkboxes in Teaching Todos/Followups left panel use native input instead of design-system custom controls (pre-existing) |
| #838 | 2026-04-22 | low | LogSession: local ToggleSwitch focus ring uses ring-indigo-500 instead of ring-indigo-600 (pre-existing, design-system 11.5) |
| #850 | 2026-04-23 | low | LogSession.test.tsx "date defaults to today" fails at ~midnight UTC due to UTC vs local timezone mismatch in date comparison; pre-existing flaky test |
| #837 | 2026-04-22 | low | TeachingTodosCard.tsx has local relativeTime duplicating formatDate.ts — filed #860 |
| #844 | 2026-04-22 | low | TeachingTodoDto projection duplicated in StudentService.ToTodo() and DashboardService inline LINQ (EF Core constraint) — filed #869 |
| #844 | 2026-04-22 | low | TeacherFollowup.Kind has no DB CHECK constraint; only DTO regex guards API path — filed #870 |
| #837 | 2026-04-22 | low | StudentRoster.tsx has local formatRelativeDate not yet refactored to use relativeTime — filed #861 |
| #852 | 2026-04-22 | low | StudentsController (4x) and CoursesController still use ValidationProblem/BadRequest(rawString) for ValidationException — filed #871 |
| #846 | 2026-04-22 | low | PromptService.cs lines 473-478: L1 sub-bullets (differs-from-native, false cognates, common errors) hardcoded in C# system prompt; overlaps with config-driven L1Adjustments block appended to user prompts. Predates #846; worth consolidating into the data-driven path. |
| #849 | 2026-04-22 | low | Root .dockerignore excludes frontend/ in worktrees, requiring manual bypass during UI review docker build; pre-existing worktree build infrastructure gap. |
| #849 | 2026-04-22 | low | E2E test student-detail-session-expanded fails on session-title-input not found; pre-existing, unrelated to labeling changes. |

| #845 | 2026-04-23 | low | Visual spec `student-detail.visual.spec.ts`: "sessions tab - expanded row" fails because testid `session-title-input` does not exist (only `log-session-title-input`); pre-existing, unrelated to task |
| #845 | 2026-04-23 | low | `.dockerignore` at repo root excludes `frontend/` which breaks `docker compose build` from worktrees when cached frontend image expires; needs investigation |
| #845 | 2026-04-23 | low | Arch: `StudentDto` nested sub-records diverge from flat-record convention used by all other response DTOs (LessonDto, SessionLogDto, etc.) — intentional for this task; worth documenting as architectural convention |
| #845 | 2026-04-23 | low | Sophy: `ReasonForStudying` semantically belongs in `StudentProfileDto` (drives teaching decisions) not `StudentIdentityDto` (demographics) — filed #880 |
| #899 | 2026-04-24 | low | LogSession.tsx mixes two "init once" idioms now — new `initializedForIdRef` for edit-mode populate, existing `didInitContent` boolean state for create-mode content pre-populate. Low-priority convention alignment; could migrate `didInitContent` to the same ref-with-id pattern in a follow-up. |
| #899 | 2026-04-24 | low | `cancelQueries` before `mutateAsync` in `useSessionAutosave` is a new idiom with no codebase precedent. Comment explains reasoning; if this pattern propagates, worth documenting in `docs/architecture-model.md` or extracting into a shared helper. |
| #901 | 2026-04-24 | low | Expanded session row has "Edit full session" link pointing to /sessions/:id/edit. DS §8.3 says inline edit is the edit mechanism — no separate edit page. Pre-existing affordance; inline edit now covers the 4 main fields. Whether to remove or keep the full-page link needs a Vera decision. |
| #907 | 2026-04-24 | low | Sidebar shows "Students" as active nav item when on LogSession edit page reached from /sessions. "Sessions" would be more consistent. Pre-existing; nav active state is not aware of entry-point routing. |
| #910 | 2026-04-24 | low | Settings page has "Save Profile" CTA; DS §8.1 Pattern C requires "Done" for full-page edit forms. Pre-existing, not introduced by this task. |
| #910 | 2026-04-24 | low | Language/CEFR toggle pill chips on Settings page are not specified in the design system (distinct from CEFR badges §5 and vocabulary chips §5). Needs Vera decision. |

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into: #833 (bug batch), #834 (seeder gaps), #835 (e2e session-log rewrite), #836 (ScenarioSeeder Hans B1), #837 (deduplication), #838 (session title from web UI), #839 (debug log privacy), #840 (Edit Student UX), #841 (stale closure + LogSession pre-populate). Already-tracked entries removed (referenced #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657). Dismissed entries removed (defensive-only, intentional, or resolved).*
