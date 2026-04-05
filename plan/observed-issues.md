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

| #186 | 2026-04-05 | low | `VoiceNote.DurationSeconds` always 0 - audio duration extraction not implemented. Field reserved for future use. |
| #186 | 2026-04-05 | low | `VoiceNoteService`: blob upload before DB commit (orphan risk on failure). Consistent with `MaterialService` pattern. |
| #186 | 2026-04-05 | dismissed | CodeRabbit: `AzureSpeechOptions.Language` startup validation - value is hardcoded `es-ES`, querying Azure locales API at startup is over-engineering |
| #186 | 2026-04-05 | deferred | CodeRabbit: `IVoiceNoteBlobStorage` missing `DeleteAsync` - filed #512, no delete endpoint exists yet |
| #186 | 2026-04-05 | deferred | CodeRabbit: audio file magic bytes / signature validation on upload - filed #513 |
| #186 | 2026-04-05 | dismissed | CodeRabbit: orphaned blob on transcription/DB failure - fix depends on DeleteAsync in #512 |
| #187 | 2026-04-05 | low | `VoiceNote` model: `BlobPath`, `OriginalFileName`, `ContentType` have no `[MaxLength]` - will be nvarchar(max) in SQL |
| #187 | 2026-04-05 | low | `AudioRecorder`: rapid double-click on Upload could trigger two concurrent uploads before state update prevents second |
