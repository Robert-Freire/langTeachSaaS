# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
| #422 | 2026-04-06 | P3:nice | PUT edited-content endpoint skips sourcePassage validation; teacher edits could bypass AC6 constraint — filed #557 |
| #422 | 2026-04-06 | P3:nice | ValidateExercisesContent silently returns null on malformed JSON (pre-existing behavior) — filed #558 |
| #422 | 2026-04-06 | minor | SectionKey normalization warmup→warmUp in BuildSectionConversationPrompt is a local workaround; could be centralized in SectionKeys class |
| #422 | 2026-04-06 | P3:nice | Session gap thresholds (2/7/14 days) hardcoded in BuildLessonPlanUserPrompt; should move to session-gap-policy.json — filed #560 |
| #422 | 2026-04-06 | P2:should | CurriculumGenerationService deserializes AI response without StripFences (pre-existing, outside diff) — filed #562 |
| #550 | 2026-04-06 | low | No e2e test for the >20-student pagination path (would require seeding 21+ students via API in e2e) |
| #550 | 2026-04-06 | low | IntersectionObserver effect recreates observer on each isFetchingNextPage toggle; minor waste, functionally correct |
|-------------|------|----------|-------------|
| #498 | 2026-04-05 | P2:should | material-upload.spec.ts can't run in nightly CI (no Azure storage creds) — excluded from parallel project, filed #503 |
| #498 | 2026-04-05 | P2:should | usage-limits.spec.ts times out in nightly CI (real AI generation too slow) — excluded from parallel project, filed #504 |
| #498 | 2026-04-05 | P3:nice | Nightly notification skips job timeout/cancellation (if:failure() misses timed_out/cancelled) — filed #507 |
| #498 | 2026-04-05 | dismissed | CodeRabbit: material-upload/usage-limits orphaned in parallel testIgnore — intentional, filed #503/#504 |
| #485 | 2026-04-05 | P3:nice | task-build-verify.py bicep step fails in worktrees with long paths (Windows path length truncation); pre-existing, not task-specific |
| #498 | 2026-04-05 | dismissed | CodeRabbit: Conversation template 5 sections false positive — BuildSections includes all sections regardless of required flag |

*Cleared 2026-04-04 during Post-Class Tracking sprint close. 6 entries triaged: #441 lesson filter batched into #494, #450/#442 MaxLength batched into #492, remaining entries deleted (pre-existing patterns, dismissed CodeRabbit notes, stale worktree artifact).*

| #186 | 2026-04-05 | low | `VoiceNote.DurationSeconds` always 0 - audio duration extraction not implemented. Field reserved for future use. |
| #186 | 2026-04-05 | low | `VoiceNoteService`: blob upload before DB commit (orphan risk on failure). Consistent with `MaterialService` pattern. |
| #186 | 2026-04-05 | dismissed | CodeRabbit: `AzureSpeechOptions.Language` startup validation - value is hardcoded `es-ES`, querying Azure locales API at startup is over-engineering |
| #186 | 2026-04-05 | deferred | CodeRabbit: `IVoiceNoteBlobStorage` missing `DeleteAsync` - filed #512, no delete endpoint exists yet |
| #186 | 2026-04-05 | deferred | CodeRabbit: audio file magic bytes / signature validation on upload - filed #513 |
| #186 | 2026-04-05 | dismissed | CodeRabbit: orphaned blob on transcription/DB failure - fix depends on DeleteAsync in #512 |
| #437 | 2026-04-05 | low | Sonnet may produce verbose exercise explanations at A1-B1 levels where Haiku brevity was an accidental asset. Monitor in future QA runs. |
| #437 | 2026-04-05 | low | UI should verify exercises per block are capped to avoid cognitive overload (17 items seen in one block). Check ExercisesRenderer display logic. |
| #187 | 2026-04-05 | low | `VoiceNote` model: `BlobPath`, `OriginalFileName`, `ContentType` have no `[MaxLength]` - will be nvarchar(max) in SQL |
| #187 | 2026-04-05 | low | `AudioRecorder`: rapid double-click on Upload could trigger two concurrent uploads before state update prevents second |
| #487 | 2026-04-05 | low | E2E tests create students/lessons but never clean up; test data accumulates in the persistent test DB (consistent with all existing e2e tests) |
| #487 | 2026-04-05 | low | `student-detail.visual.spec.ts` does not scroll to capture the linked lesson area; consider adding a scrolled screenshot for regression coverage |
| #534 | 2026-04-06 | low | ExcelImporter.cs: malformed date strings (non-empty, non-parseable) are silently treated as null date instead of being rejected. CodeRabbit finding, out of scope for t534. |
| #534 | 2026-04-06 | low | StudentForm: partially-completed difficulty rows (one field filled, one empty) are silently discarded on save rather than blocking submission. Consider validation UX improvement. |
| #534 | 2026-04-06 | low | Trend thresholds (3 consecutive sessions for worsening, 2 sessions for improving) are hardcoded in DifficultyTrendService. Sophy recommends moving to config for pedagogy tuning. |
| #534 | 2026-04-06 | low | DemoSeeder has no students with difficulties; SessionLogDialog "Difficulties mentioned" section untestable in standard review-ui runs without manual API calls. |
| #188 | 2026-04-06 | low | SuggestedDifficulties count cap missing on CreateSessionLogRequest - buggy client could bloat Student.Difficulties. Low risk (teacher-only app). |
| #188 | 2026-04-06 | low | Competency/severity vocabulary in DifficultyConstants + AI prompt + DifficultyDto consumers - 3 update points if a 6th competency is added. Known drift. |
