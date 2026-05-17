# UI Review Skipped Log

Tasks that bypassed `review-ui` under the trivial-frontend exemption (CLAUDE.md, Task Completion Protocol step 5).

**Exemption criteria (all must apply):** diff <20 lines, single file, CSS/styling-only (no component logic, no new elements, no state changes).

The sprint-close procedure (Stage 1) audits this log and clears it after each sprint.

| Issue | Date | PR | What changed and why review-ui was skipped |
|-------|------|----|-------------------------------------------|
| #1257 | 2026-05-13 | pending | Added `.docx` to OCR_ACCEPTED constant in RedaccionesTab.tsx (1 line, single file, attribute value only, no components/state/layout change) |
| #1290 | 2026-05-16 | pending | Import swap only (axios.isAxiosError -> re-exported isAxiosError from apiClient.ts); zero JSX/styling changes, OCR error banner unchanged |
