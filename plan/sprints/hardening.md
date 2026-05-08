# Sprint: Hardening

## The teacher's story

Jordi opens Atelier on Monday morning. The product greets him by its real name: "Atelier" in the sidebar, in the tab title, in the sign-up email he forwarded to a colleague. Nothing dramatic else has changed. The dashboard is the dashboard. The Atelier Assistant still works.

But the things that nagged him last week, that he hadn't quite mentioned because they felt minor, are quiet now. The CEFR badge that said "B1.1" on one card and "B1" on another now agrees with itself everywhere. The session log that occasionally lost a typed title saves cleanly. The little new-session form he'd started ignoring (because pressing Apply did nothing) actually applies.

He doesn't notice this sprint the way he'll notice the next one (Text Correction). He notices it the way you notice good plumbing: things just work.

## What changes for Jordi

**The visible bit:** the product is now called **Atelier**, end to end. LangTeach was always the codebase name; Atelier is what he says to colleagues. The rebrand makes the words on screen match the words he uses.

**The invisible bit:** small bugs and inconsistencies surfaced during the Unified Voice & Chat sprint are gone. CEFR levels are canonical. Atelier Assistant extraction edge cases (todos no longer spawn ghost session cards; date/time fields surface correctly) are fixed. Visual review patterns are documented in the design system instead of living in agent memory.

**The teacher value of "boring":** the Text Correction sprint that comes next will land on a stable, consistent codebase, not on a pile of accumulated paper cuts. Worth a sprint of housekeeping now to avoid spending the corregir-redacción sprint fighting yesterday's debt.

## What this sprint delivers

**Rebrand to Atelier (#1078)**
Every user-visible "LangTeach" string becomes "Atelier": tab title, sidebar, sign-up flow, emails, error states, empty states. Codebase identifiers (npm package names, namespaces, repo slugs) stay as LangTeach. Source of truth: a single shared brand constant or token, not 60 string replacements.

**CEFR canonicalization (#1082)**
A single source of truth for accepted CEFR levels (A1, A2, B1, B2, C1, C2). Prompts, validators, UI badges, seed data all read from it. Eliminates the duplicated regex in `PatchStudentRequest`/`UpdateStudentRequest` and the duplicated `CEFR_ORDER` constant on the frontend (folds in #713 partially).

**Atelier Assistant extraction polish (#1064, #1065, #1072, #1076)**
- Vera-reviewed canonicalization of the Atelier Assistant patterns into `docs/design-system.md` (FAB, ProposalCard, NewStudentFields, panel chrome).
- Todo-input no longer spawns a phantom newSession proposal; todo cards now show their date.
- Extraction polish: `countryOfResidence` gap, dangling preamble reference, `teacherText` sanitization.
- `SessionSummaryHeader` either gets wired in or gets deleted; `whatWasCovered` suppression on the no-open-session path tightened.

**Dedup and config-extraction sweep (#1066)**
Pull repeated patterns into shared utilities or config:
- `voiceUpdateMerge.ts` `mergeUnique` helper (dedup pattern repeated 5x).
- `extractionNormalizer.ts` 30-entry alias table moves to data/ or out via prompt.
- Extract `useVoiceExtractionFlow` hook (currently duplicated across `Students.tsx` and `StudentDetail.tsx`, with diverged failure states).
- Folds in the small prompt-cleanup items from the code-review backlog: ExtractedReflectionDto flattening (#1029), weekday backward-resolution prompt duplication (#1041/#1042), redundant negative suppression in IMPORTANT CONTEXT preamble (#1070).

**Standalone hardening batch (#1067)**
- Rate limit on `POST /api/students/extract-profile`.
- In-flight request cancellation in `useAtelierAssistant` (AbortController or monotonic token).
- e2e helper consolidation, color sweep, nav pattern fix on Courses/Students/StudentRoster.

**Infra and tooling**
- `#1080` review-ui-sprint hallucination bug: agent invented 4 of 6 findings during last sprint close. Tighten the agent prompt or its evidence-gathering step before we trust it again.
- `#1059` e2e port 5000 conflict: something in the stack binds 5000, breaking visual smoke tests.
- `#1083` (new) e2e `db-helper` reads test teacher email from env instead of the wrong hardcoded `langteach.io` value (currently breaks every Atelier visual spec at seed).
- `#1084` (new) `task-build-verify.py` bicep step double-prefixes paths in worktrees.
- `#1048` BACPAC backup failed 2026-05-03: investigate, fix, document recovery.
- `#888` Nightly E2E failure tracker: audit the seven dated failures (#765, #786, #791, #804, #816, #821, #843) and either fix, close as stale, or consolidate.

**Bug fixes lifted from no-milestone backlog**
- `#611` deduplicate weakness blocks in lesson plan prompt (STUDENT ERROR PROFILE vs DECLARED WEAKNESSES).
- `#610` restore `trueFalse` `sourcePassage` guard.
- `#421` coercion hardening: early-return bypass and inconsistent item validation in `coerceExercisesContent`.
- `#36` Settings accepts HTML tags in display name without sanitization.

## What we're NOT building

- New teacher-facing features. Text Correction (corregir redacciones) is the next sprint, not this one.
- The Atelier Assistant Part 3 architectural work (proposal field taxonomy externalization, `useMutation` migration, dedicated context provider) — defers to #1010.
- Curriculum data backfill (#935 iberia units) — content work, separate.
- Any nightly E2E rewrites beyond the audit/triage of existing failures.
- Visible UI redesigns. Polish that fixes a real bug is in scope; cosmetic tweaks are not.

## How to use this document

Every task plan, review, and reviewer should be checked against one question: **does this leave the codebase in a state where the next sprint can ship Text Correction without first cleaning up the same paper cuts?** If a task ships but creates a new inconsistency or leaves a duplicated pattern in place, it is not done.

The sprint is invisible to Jordi. The only visible change is the rebrand. Everything else is plumbing for what comes next.
