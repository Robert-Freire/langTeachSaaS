# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into #833 (bug batch: todo validation + countdown + difficulty feedback), #837 (deduplication: getInitials/formatRelativeDate/CEFR_ORDER). Remaining entries deleted (verified safe, intentional per spec, already tracked in #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657, or consistent with existing patterns).*

## Sprint: Student Profile Voice Input

| Issue | Date | Finding | Severity |
|-------|------|---------|----------|
| #928 | 2026-04-25 | `Button variant="ghost"` uses `hover:bg-muted` (near-white gray) while the app's surface-container-low hover color `#F4F2FD` (lavender) is hardcoded in 10+ places. Pre-existing divergence between the shared Button component and app-level ghost-style links. Consider aligning `--muted` token to `#F4F2FD` or introducing a `surface-container-low` CSS variable. | Low |
| #951 | 2026-04-26 | Indigo inline-link hover treatment inconsistent across student cards: `LastSessionCard` uses `hover:text-indigo-800` only (per issue AC), `LessonHistoryCard` adds `hover:underline`. Consider standardising to one pattern (add `hover:underline` everywhere, or drop it everywhere). | Low |
| #947 | 2026-04-26 | Arch note: `isEmptyExtraction` in `VoiceUpdateDrawer.tsx` uses `includeNameCheck` to early-return `false` (not empty) when name is extracted. Logic is correct, but reviewer found it non-obvious. Consider renaming to `isExtractionEmpty` with clearer create/update branching if the function grows. | Low |
| #952 | 2026-04-26 | Full-card `Link` pattern in `CompactSessionCard` diverges from `LastSessionCard` (icon-button link beside title) and `StudentCoursesCard` (div+onClick). Three navigation patterns across student cards. Spec-driven for #952 but worth standardising across cards in a future pass. | Low |
| #927 | 2026-04-26 | Arch review flagged `location.state.from` nav state approach as potentially inconsistent since LastSessionCard and SessionHistoryTab link to same session edit route without state. Dismissed: intentional per issue spec — only the Sessions list entry point should activate "Sessions" nav; other entry points are in the student detail context and should keep "Students" active. | Dismissed |
