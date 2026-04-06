# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
| #550 | 2026-04-06 | low | No e2e test for the >20-student pagination path (would require seeding 21+ students via API in e2e) |
| #550 | 2026-04-06 | low | IntersectionObserver effect recreates observer on each isFetchingNextPage toggle; minor waste, functionally correct |
|-------------|------|----------|-------------|

*Cleared 2026-04-04 during Post-Class Tracking sprint close. 6 entries triaged: #441 lesson filter batched into #494, #450/#442 MaxLength batched into #492, remaining entries deleted (pre-existing patterns, dismissed CodeRabbit notes, stale worktree artifact).*
