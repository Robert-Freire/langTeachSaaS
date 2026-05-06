# UI Review Skipped Log

Tasks that bypassed `review-ui` under the trivial-frontend exemption (CLAUDE.md, Task Completion Protocol step 5).

**Exemption criteria (all must apply):** diff <20 lines, single file, CSS/styling-only (no component logic, no new elements, no state changes).

The sprint-close procedure (Stage 1) audits this log and clears it after each sprint.

| Issue | Date | PR | What changed and why review-ui was skipped |
|-------|------|----|-------------------------------------------|
| #1057 | 2026-05-03 | TBD | Zero frontend files changed; backend-only flag added to reflection extraction pipeline |
| #1063 | 2026-05-03 | TBD | Pure deletion of dead Help NavLink from AppShell; <20 lines, no logic/state changes, no new elements |
| #1064 | 2026-05-04 | TBD | Documentation-only change to docs/design-system.md; zero frontend files changed, no component logic or state |
| #1072 | 2026-05-04 | TBD | Added one FieldRow for "Country" to NewStudentFields.tsx; 5 lines, single file, no new component logic or state |
| #1110 | 2026-05-05 | TBD | Zero frontend files changed; fix is pure backend (AzureSpeechTranscriptionService chunking + PromptService prompt patch) |
| #1126 | 2026-05-06 | TBD | Zero frontend files changed; fix is a single-sentence prompt change in PromptService.cs (open-session context hint) with no component logic, no new elements, no state changes |
