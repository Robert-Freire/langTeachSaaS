# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
|-------------|------|----------|-------------|
| #441 | 2026-04-03 | low | SessionLogDialog fetches all lessons (pageSize=100) and filters by studentId client-side; no studentId filter exists on GET /api/lessons. For teachers with many lessons this is inefficient. Add studentId filter to LessonListQuery in a future backend task. |
| #450 | 2026-04-03 | low | SessionLogDtos TopicTags string has no [MaxLength]; consistent with other JSON fields (nvarchar(max)) but unbounded client input. Consider adding MaxLength validation in a future pass. |
| #450 | 2026-04-03 | low | LevelReassessment validation messages are English-hardcoded and returned directly to frontend. Consistent with existing HomeworkStatus pattern but diverges from i18n best practice. |

*Cleared 2026-04-02 during Pedagogical Quality sprint close. 14 entries triaged: #420 (Catalan bug), #424 (Isaac pedagogy pass), #422 (prompt consistency) received new findings. Remaining entries deleted (dismissed CodeRabbit notes, no-user-impact inconsistencies, i18n patterns, stale QA spec comments, e2e AI coverage gap covered by Teacher QA).*
