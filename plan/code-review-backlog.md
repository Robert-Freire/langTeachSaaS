# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

## Open

- *#1362 (arch, future-reuse, low): quota-429 client handling (detect status, extract resetsAt, format date) is now inline in two places (useGenerate hook + RedaccionDetail onError). If a third 429 call site appears, extract a shared `parseQuotaError` util. Not a current violation (two call sites, different abstraction layers).*

---

## Cleared history

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into #833 (bug batch) and #837 (deduplication). Remaining entries deleted (verified safe, intentional per spec, or already tracked).*

## From #1359 (2026-05-24)

- `RedaccionCorrectionPromptBuilder.ParseModel` is `internal static` but called by sibling builders (`RedaccionLevelFilterPromptBuilder`, `RedaccionScopeAffirmerPromptBuilder`). Should move to a shared utility (e.g., `ClaudeModelParser` static class) once more callers appear. Low risk; no behavioral issue.

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. Actionable entries batched into #989 (DS component polish), #990 (code hardening), #992 (navigation UX). Cosmetic/dismissed entries deleted.*

*Cleared 2026-05-11 during Text Correction sprint close. Actionable entries batched into #1222-#1233. Cosmetic entries deleted; intentional trade-offs dismissed.*

*Cleared 2026-05-24 during Groups sprint close. The Hardening II (2026-05-16) and #1297/#1326 (2026-05-23) entries were batched into the Groups-milestone backlog issues:*
- *#1359 (prompt/config): #1263 grammarOutOfScope noise, #1286 NextLevel CEFR chain, #1286 wordCount>800 magic number, #1286 Spanish praise template hardcoded copy.*
- *#1360 (arch dedup + consistency): #1286 SanitizeForPrompt dup, #1279 OCR_ naming split, #1301 AppendStandardBlocks helper, #1319 JsonSerializerOptions 7th copy, #1326 DashboardService projection duplication, #1297 StudentDetail corrections-query coupling, #1263 grammarFocusTargets subset-validation guard.*
- *Deleted as intentional/low-value: #1263 generation exclusions-as-safety-net (kept by design), #1301 BuildSectionConversationPrompt omits grammar block (intentional per spec), #1319 token counts not returned to callers (queryable via correlationId), #1293 RedaccionDetail timer useRef-vs-cleanup convention mismatch (functionally correct).*
