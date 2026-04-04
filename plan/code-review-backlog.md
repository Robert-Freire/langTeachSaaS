# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-04-02 during Pedagogical Quality sprint close. All entries triaged: 7 batched into #421 (coercion hardening), #422 (prompt consistency), #423 (pedagogy config bugs), #426 (PII logging), #427 (fragile test assertions). Remaining entries deleted (i18n strings, cosmetic ordering, eslint suppression, .dockerignore, style inconsistencies, intentional fallbacks, redundant test round-trips).*

## PR #444 (Excel migration tool, 2026-04-03)

| Severity | Finding | Source |
|----------|---------|--------|
| Minor | Race condition in idempotency guard (AnyAsync + Add without transaction). Acceptable for single-operator one-time tool. | code-review |
| Minor | ExtractDate scans all 7 columns; content cells (B-E) with numeric values could theoretically match as OA dates. Low risk in practice. | code-review |
| Minor | DateTime.TryParse without explicit CultureInfo; may misinterpret MM/dd vs dd/MM on non-en locale machines. | code-review |
| Minor | Unknown CLI args silently ignored; typos (e.g. --dryrun) give no warning. | code-review |

## PR #440 (SessionLog entity, 2026-04-03)

| Severity | Finding | Source |
|----------|---------|--------|
| Minor | String fields (PlannedContent, ActualContent, etc.) lack MaxLength on DTOs, allowing unbounded nvarchar(max) | code-review |
| Minor | LevelReassessmentSkill/Level are free-text with no allowlist validation against CEFR skills | code-review, sophy |
| Minor | Create/Update request DTOs are identical, could share a base class | code-review |
| Minor | SessionLogDto omits TeacherId (inconsistent with Student/Lesson DTOs that include it) | sophy |
| Minor | Update is full-replace; partial sends null out nullable fields silently | sophy |

## PR #445 (Session summary header, 2026-04-03)

| Severity | Finding | Source |
|----------|---------|--------|
| Minor | `Email` prop on base controller uses `?? ""` when claim missing; could silently create teacher with blank email (pre-existing pattern) | code-review |
| Minor | Backend ValidationException messages embed user-facing text; frontend should own display copy (pre-existing pattern) | code-review |
| Minor | `levelReassessmentPending` logic (compare override vs CefrLevel) duplicated in SessionLogService.GetSummaryAsync and SessionHistoryService.LoadSkillLevelOverridesAsync; extract shared predicate | sophy |

## PR #481 (future date validation, 2026-04-04)

| Severity | Finding | Source |
|----------|---------|--------|
| Minor | ValidationException message "Session date cannot be in the future." is hardcoded in backend; pre-existing pattern — backend already uses literal strings for all validation messages in this file | code-review |

## PR #431 (exercise coherence prompt fixes, 2026-04-03)

| Severity | Finding | Source |
|----------|---------|--------|
| Minor | sourcePassage CRITICAL instruction duplicates what the JSON schema already declares; a backend validator rejecting empty sourcePassage values would be stronger | sophy |
| Minor | grammar scope CRITICAL instruction ("MUST only use...") is tautological with the GRAMMAR SCOPE block already in the prompt; consider removing | sophy |
| Minor | CEFR level constraint on roleAPhrases/roleBPhrases is the third place "stay at level" is stated; prompt weight inflation trend to watch | sophy |
