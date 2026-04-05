# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
|-------------|------|----------|-------------|
| #498 | 2026-04-05 | P2:should | material-upload.spec.ts can't run in nightly CI (no Azure storage creds) — excluded from parallel project, filed #503 |
| #498 | 2026-04-05 | P2:should | usage-limits.spec.ts times out in nightly CI (real AI generation too slow) — excluded from parallel project, filed #504 |
| #498 | 2026-04-05 | P3:nice | Nightly notification skips job timeout/cancellation (if:failure() misses timed_out/cancelled) — filed #507 |
| #498 | 2026-04-05 | dismissed | CodeRabbit: material-upload/usage-limits orphaned in parallel testIgnore — intentional, filed #503/#504 |
| #498 | 2026-04-05 | dismissed | CodeRabbit: Conversation template 5 sections false positive — BuildSections includes all sections regardless of required flag |

*Cleared 2026-04-04 during Post-Class Tracking sprint close. 6 entries triaged: #441 lesson filter batched into #494, #450/#442 MaxLength batched into #492, remaining entries deleted (pre-existing patterns, dismissed CodeRabbit notes, stale worktree artifact).*
