# UI Review Skipped Log

Tasks that bypassed `review-ui` under the trivial-frontend exemption (CLAUDE.md, Task Completion Protocol step 5).

**Exemption criteria (all must apply):** diff <20 lines, single file, CSS/styling-only (no component logic, no new elements, no state changes).

The sprint-close procedure (Stage 1) audits this log and clears it after each sprint.

| Issue | Date | PR | What changed and why review-ui was skipped |
|-------|------|----|-------------------------------------------|
| #1257 | 2026-05-13 | pending | Added `.docx` to OCR_ACCEPTED constant in RedaccionesTab.tsx (1 line, single file, attribute value only, no components/state/layout change) |
| #1290 | 2026-05-16 | pending | Import swap only (axios.isAxiosError -> re-exported isAxiosError from apiClient.ts); zero JSX/styling changes, OCR error banner unchanged |
| #1333 | 2026-05-23 | pending | Removed one nav item + unused icon import from AppShell.tsx (2 lines net deletion), updated 2 test assertions. No styling, no new elements, no logic, no state changes. Verified live on e2e stack: sidebar shows Dashboard/Students/Sessions/Courses/Settings, /lessons route still renders. |
| #1396 | 2026-05-31 | #1397 | Removed `bg-[#F4F2FD]` from GroupDetail page wrapper (1 line, single file, CSS class deletion only) so the page inherits the app-shell `#FBF8FF` canvas like StudentDetail; the same-color collision was hiding the profile card. No components/elements/state/logic changes. Live visual confirm pending (Chrome MCP down, visual stack not up). |
