# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into #833 (bug batch: todo validation + countdown + difficulty feedback), #837 (deduplication: getInitials/formatRelativeDate/CEFR_ORDER). Remaining entries deleted (verified safe, intentional per spec, already tracked in #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657, or consistent with existing patterns).*

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. Actionable entries batched into #989 (DS component polish), #990 (code hardening), #992 (navigation UX). Dismissed and cosmetic entries deleted (#927 dismissed, #947 rename too cosmetic).*

## #1008 (2026-04-28)

- **AppShell transcription state lift** (arch-reviewer): `transcription: string | null` for the Atelier Assistant lives in AppShell. This works for part 1 but deviates from the pattern of sub-panel state living local or in a dedicated context (compare `VoiceUpdateDrawer` state in `StudentDetail.tsx`). If parts 2/3 add more cross-cutting assistant state (proposals, selection, apply flow), refactor to a dedicated `AtelierAssistantContext` provider. Resolved at #1009: all state now lives in `useAtelierAssistant` hook. Context provider can be considered for Part 3 (#1010) if cross-route state is needed.

## #1009 (2026-04-28)

- **Proposal field taxonomy hardcoded in C#** (Sophy): `AssistantController` emits `EmitProposal` calls for 7 hard-coded field/label pairs. `PatchStudentRequest`/`PatchSessionRequest` mirror this whitelist. Long-term: extract to `data/assistant/proposal-fields.json` consumed by both emission loop and patch dispatch. Assess at Part 3+ (#1010).
- **CEFR regex duplicated** (Sophy): `PatchStudentRequest.CefrLevel` regex `^(A1|A2|B1|B2|C1|C2)$` duplicates `UpdateStudentRequest`. Both should read from `IPedagogyConfigService.AllowedCefrLevels`. Batch with #837-style deduplication in sprint close.
- **`useAtelierAssistant` uses raw async/await instead of `useMutation`** (arch-reviewer): The multi-card orchestration pattern doesn't fit single-mutation well. Cache invalidation is handled via `invalidateQueries`. Reassess if retry/optimistic-update patterns become complex in Part 3.
