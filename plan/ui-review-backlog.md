# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Seeder coverage gaps batched into #834. UX polish items (combobox summary, Focus Areas description) batched into #840. Remaining entries deleted (intentional per Stitch spec, covered by unit tests, or pre-existing infrastructure).*

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. DS/component findings batched into #989 (DS component polish batch). Seeder coverage gap (#904) batched into #991 (e2e test fixes). Environment-only entry (#906) deleted. Navigation findings batched into #992.*

*Cleared 2026-05-03 during Unified Voice & Chat sprint close. All Atelier Assistant pattern findings (#997, #1008 [4 patterns], #1005, #1004, #1010, #1029) batched into #1064 (Vera DS canonicalization pass -- Hardening milestone). Deleted: #1030 close-guard fix (no visual to track per inline note).*

*Cleared 2026-05-11 during Text Correction sprint close. Findings batched into: #1225 (chip legend + breadcrumb, frontend unification), #1231 (thumbs label, Atelier picker contrast, DS spec updates, AtelierAssistantPanel tonal color). I4 mobile header overflow REFUTED (pre-existing, header not changed in sprint). M3 native date picker in Atelier logged to observed-issues for next pass.*

| #1274 | 2026-05-16 | review-ui could not visually verify M2 (thumbs 44px hit area) and M3 (resize-none on CONSIGNA) because Docker e2e stack serves main repo code, not worktree (pre-existing limitation #1113). Both changes confirmed via Playwright DOM inspection on the live e2e stack during live verify step. |
| #1327 | 2026-05-23 | GroupAvatarCluster (sm overlap, lg 2x2, +N overflow) is not yet documented in docs/design-system.md. Vera should add a section before this component is reused in group detail / session-edit screens. |
