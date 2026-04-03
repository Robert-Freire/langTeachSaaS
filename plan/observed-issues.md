# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
|-------------|------|----------|-------------|
| #441 | 2026-04-03 | low | SessionLogDialog fetches all lessons (pageSize=100) and filters by studentId client-side; no studentId filter exists on GET /api/lessons. For teachers with many lessons this is inefficient. Add studentId filter to LessonListQuery in a future backend task. |
| #450 | 2026-04-03 | low | SessionLogDtos TopicTags string has no [MaxLength]; consistent with other JSON fields (nvarchar(max)) but unbounded client input. Consider adding MaxLength validation in a future pass. |
| #450 | 2026-04-03 | low | LevelReassessment validation messages are English-hardcoded and returned directly to frontend. Consistent with existing HomeworkStatus pattern but diverges from i18n best practice. |
| #442 | 2026-04-03 | medium | SessionLogDtos CreateSessionLogRequest and UpdateSessionLogRequest string fields lack [MaxLength] attributes (PlannedContent, ActualContent, etc.). Unbounded input could overflow or cause excessive storage. |
| #442 | 2026-04-03 | low | SessionLogsController email claim fallback uses null-forgiving ?? "" — if ClaimTypes.Email is missing, blank email propagates to UpsertTeacherAsync. Same pattern exists in other controllers; fix in a security pass. |
| #431 | 2026-04-03 | low | Grammar scope non-introduction constraint (PromptService.cs:625) is silently skipped when BuildGrammarScopeBlock returns empty (e.g. levels with no defined scope). Levels without a scope have no constraint on grammar introduction. Intentional by design but consider a fallback general constraint for unlisted levels. |

*Cleared 2026-04-02 during Pedagogical Quality sprint close. 14 entries triaged: #420 (Catalan bug), #424 (Isaac pedagogy pass), #422 (prompt consistency) received new findings. Remaining entries deleted (dismissed CodeRabbit notes, no-user-impact inconsistencies, i18n patterns, stale QA spec comments, e2e AI coverage gap covered by Teacher QA).*
