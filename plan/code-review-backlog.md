# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into #833 (bug batch: todo validation + countdown + difficulty feedback), #837 (deduplication: getInitials/formatRelativeDate/CEFR_ORDER). Remaining entries deleted (verified safe, intentional per spec, already tracked in #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657, or consistent with existing patterns).*

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. Actionable entries batched into #989 (DS component polish), #990 (code hardening), #992 (navigation UX). Dismissed and cosmetic entries deleted (#927 dismissed, #947 rename too cosmetic).*

## #1008 (2026-04-28)

- **AppShell transcription state lift** (arch-reviewer): `transcription: string | null` for the Atelier Assistant lives in AppShell. This works for part 1 but deviates from the pattern of sub-panel state living local or in a dedicated context (compare `VoiceUpdateDrawer` state in `StudentDetail.tsx`). If parts 2/3 add more cross-cutting assistant state (proposals, selection, apply flow), refactor to a dedicated `AtelierAssistantContext` provider. Deferred — assess at #1009.
