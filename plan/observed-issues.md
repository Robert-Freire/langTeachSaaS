# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
|-------------|------|----------|-------------|
| #309 | 2026-03-28 | Important | CurriculumValidationService.cs:42-47 interpolates targetLevel into AI prompt without sanitization (prompt injection risk) |
| #309 | 2026-03-28 | Important | UpdateLearningTargetsRequest.LearningTargets has no array-count bound at DTO level |
| #309 | 2026-03-28 | Minor | ContentBlock.tsx learning-target editing state not reset on lesson/student navigation (missing key prop) |

*Cleared 2026-03-27 during Student-Aware Curriculum sprint close. 10 entries deleted, 3 batched into issues #302 (TemplateUnitRef), #298 (warnings recompute), observed #151 (e2e gap).*
| #338 | 2026-03-28 | high | Docker e2e stack build fails: API Dockerfile cannot access data/ directory (embedded resources) because build context is ./backend. Affects docker-compose.e2e.yml and docker-compose.yml. Fix: change API build context to repo root and update COPY paths. |
