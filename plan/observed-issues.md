# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
| #1007 | 2026-04-29 | P3:nice | `hover:text-indigo-800` vs `hover:text-indigo-700` split across codebase -- lesson renderers, StudentRoster, PendingFollowups, CourseDetail still use -800; student cards now use -700. Needs a sweep to standardize. |
| #1002 | 2026-04-28 | low | Keyboard shortcut hint (⌘K label-sm text below sidebar CTA) is an undocumented pattern in the design system. Needs Vera sign-off before it becomes a reusable convention. |
| #1002 | 2026-04-28 | medium | AppShell sidebar links to `/help` (added by #1002) but no route exists in App.tsx. Clicking Help navigates to an unmatched screen. Needs a Help page or the link removed. |
| #1004 | 2026-04-28 | low | `TeachingTodosCard.test.tsx` line 141 flakes in full suite runs (passes in isolation) due to date-relative text matching combined with test ordering. Pre-existing; not introduced by this task. |
| #1004 | 2026-04-28 | low | Low-confidence STT visual cues (underline/italic on uncertain words) cannot be implemented: `VoiceNote` API only returns a `transcription: string`. Backend would need to add a confidence-regions field before frontend can render per-token cues. |

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into: #833 (bug batch), #834 (seeder gaps), #835 (e2e session-log rewrite), #836 (ScenarioSeeder Hans B1), #837 (deduplication), #838 (session title from web UI), #839 (debug log privacy), #840 (Edit Student UX), #841 (stale closure + LogSession pre-populate). Already-tracked entries removed (referenced #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657). Dismissed entries removed (defensive-only, intentional, or resolved).*

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. Batched into: #989 (DS polish), #990 (code hardening), #991 (e2e fixes), #992 (navigation UX), #993 (infra). Already-tracked entries deleted (#874, #860, #861, #869, #870, #871, #880 already had issues). Dismissed and cosmetic entries deleted (intentional patterns, pre-existing with no risk escalation). Smoke-test dismissed entries removed.*

| #994-sophy | 2026-04-27 | low | Voice-flow state machine duplicated across Students.tsx and StudentDetail.tsx — failure state already diverged (Students returns to 'recording', StudentDetail returns to 'idle'). Extract useVoiceExtractionFlow hook. |
| #994-sophy | 2026-04-27 | low | voiceUpdateMerge.ts: case-insensitive dedup pattern repeated 5× (nativeLanguages, spokenLanguages, interests, objectives, difficulties). Extract mergeUnique helper. |
| #994-sophy | 2026-04-27 | low | extractionNormalizer.ts: 30-entry multi-language alias table is config-in-code. Move to data/ or tighten prompt to return canonical English values. |
| #994-security | 2026-04-27 | low | POST /api/students/extract-profile has no per-user rate limit — any authenticated teacher can fire it in a tight loop. Add sliding-window policy or propagate ClaudeRateLimitException as 429. |
| #990-arch | 2026-04-28 | low | LogSession.tsx: activeDifficulties wrapped in useMemo but adjacent pendingFollowups/pendingTodos/showPrevHomework are inline filters on the same student dep — inconsistent; no other page uses useMemo selectively. |
| #990-sophy | 2026-04-28 | low | PromptService.BuildSystemPrompt: "You are an expert {language} teacher..." opening lines and several other strings still hardcoded in C#; mixed extraction pattern (some in prompt-fragments.json, rest inline). Defer to a follow-up task. |
| #992-arch | 2026-04-29 | low | Courses.tsx:96, Students.tsx, StudentRoster.tsx: div+onClick nav pattern (same issue fixed in StudentCoursesCard). Out of scope for #992 (which targets student-detail cards only). |
| #992-arch | 2026-04-29 | low | SessionHistoryTab.tsx: "Open full session" link is now text-sm while other secondary action links in the app use text-xs font-medium. Intentional per #992 issue spec (DS §6 fix); may want to align convention in a future DS pass. |
