# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
|---|---|---|---|

<!-- No open rows. Add new observations below the header above. -->

---

## Cleared history

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into: #833 (bug batch), #834 (seeder gaps), #835 (e2e session-log rewrite), #836 (ScenarioSeeder Hans B1), #837 (deduplication), #838 (session title from web UI), #839 (debug log privacy), #840 (Edit Student UX), #841 (stale closure + LogSession pre-populate). Already-tracked entries removed (referenced #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657). Dismissed entries removed (defensive-only, intentional, or resolved).*

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. Batched into: #989 (DS polish), #990 (code hardening), #991 (e2e fixes), #992 (navigation UX), #993 (infra). Already-tracked entries deleted (#874, #860, #861, #869, #870, #871, #880 already had issues). Dismissed and cosmetic entries deleted (intentional patterns, pre-existing with no risk escalation). Smoke-test dismissed entries removed.*

*Cleared 2026-05-03 during Unified Voice & Chat sprint close. Batched into: #1064 (Vera DS canonicalization, Hardening), #1065 (Atelier extraction intent leakage, Hardening), #1066 (dedup and config-extraction sweep, Hardening), #1067 (standalone hardening batch, Hardening), #1063 (/help broken link, current sprint, merged). Already-filed: #1059 (e2e port 5000) moved to Hardening. Deleted: smoke-test new-student apply 400 (fixed by #1058); #992-arch SessionHistoryTab text-sm (intentional per #992 spec); #1056 useEffect-based state reset pattern (speculative); #1004 STT confidence regions (will resurface organically).*

*Cleared 2026-05-07 during Hardening sprint close. Filed: #1146 (/dashboard blank route), #1147 (atelier extraction config externalization), #1148 (frontend post-Hardening polish), #1149 (backend + e2e + ops cleanup). Deleted as already shipped via closed Hardening tasks (#994/#990/#992/#1031/#1049/#1051/#1056/#1075/#1076/#1078 lineage).*

*Partial batch 2026-05-09 (PM session). Filed: #1175 (accented-char offset), #1176 (Vera DS correction annotation spec), #1177 (tech-debt sweep). Dismissed: #1082 CEFR_SUBLEVELS (intentional), #1113 review-ui worktree limitation (documented).*

*Cleared 2026-05-24 during Groups sprint close. This file had not been cleared at the Text Correction (closed 05-11) or Hardening II (closed 05-17) closes, so ~75 rows had accumulated.*

*Filed and triaged into the Groups milestone to fix this sprint (#1359, #1360, #1362, #1363); #1361 kept as backlog (no milestone) for a future pedagogy sprint:*
- *#1359 [Groups] — tech-debt(corrections): prompt-health cleanup + AI param/config externalization. Batched: #1219 x2 (L1 note skip + OFFSETS token bloat), #1224 x2, #1203 verbatim-echo, #1229 CEFR calibration dup, #1263 grammarOutOfScope noise, #1265 x2 (wrapup/warmup dup), #1293 AI-params config, #1222 always-keep JSON, #1203 ser/estar examples, #1065 trigger phrases, #1286 NextLevel/wordCount/praise-template.*
- *#1360 — tech-debt(arch): dedup + DTO/naming consistency. Batched: #1286 SanitizeForPrompt, #1203 sanitization asymmetry, #1207 STATUS_BADGE, #1326 DashboardService projection, #1297 StudentDetail query, #1319 JsonSerializerOptions, #1301 AppendStandardBlocks, #1215/#1229 StripFencesAndPreamble, #1065 DueDate type, #1165 SessionId/SessionLogId, #1205 date concat, #1338 NaN count, #1279 OCR naming, #1263 subset validation.*
- *#1361 [backlog] — pedagogy(generation): ceiling + L1 in generation. Batched: #smoke-hardening-ii course ceiling + ser/estar examples + soften-only-if-G, teacher-qa soft-ceiling decision + L1 contrastive + coverage drift, #1215 register-rule filter, #1302 ScopeAffirmer trivial span.*
- *#1362 — bug batch (P2): #1223 corrections quota bypass, sprint-close PDF export timeout, #1307 PATCH null-ambiguity, #1237 x2 (orphan blob + SAS URL).*
- *#1363 — design-system (Vera): #1327 GroupAvatarCluster, #1328 typeahead glassmorphism, #1331 group pill format, #1330 GroupEdit autosave, #1351 annotation badge, #1181 CorrectionDrawer footer, #1185 Atelier session picker.*

*Deleted as resolved: #1331 migration fixes (done in task), #1284 "sonner build failure" (worktree npm-ci-timing artifact; sprint/groups builds clean), #1297 duplicate-GroupId migration conflict (fixed 96cfc16b), #1297 DemoSeeder XOR seed failure (= #1356, fixed by PR #1358), #1328 GroupService.GetByIdAsync OrderBy (fixed in task), #smoke-hardening /dashboard blank (shipped #1146), corrigiendo spinner outside local flow (shipped #1299).*

*Deleted as dismissed/refuted/intentional/false-positive: #1231 mic-retry indigo, review-ui-sprint "Log Session" clip (refuted), #1229 Conflict-shape (false positive), #1229 StripFences (intentional), #1082 CEFR_SUBLEVELS, #1232 soft moat assertion, #1294 telemetry None-vs-null (cosmetic, decision correct).*

*Deleted as low-value / stale / pre-existing-flake / documented-limitation / post-merge-verify-now-shipped / process-note: StudentForm + StudentRoster parallel-vitest flakes, #1113 review-ui worktree limitation, #1194 CS8602 test-file nullable, test-coverage gaps (#1225/#1192/#1207/#1151/#1258/#888), #1274 ring no-line, #1205-era minor UX (card-row click, CORREGIDA editable, /atelier + Generate-Full-Lesson empty states), #1258/#1263 post-merge verify notes (sprints closed), #1326 hasVoiceNote on create, #1301 marco-b1 selector, teacher-qa/smoke process learnings (already captured in feedback_testing_expectations memory). One judgment-call drop: #smoke-text-correction Atelier extraction phantom-profile-data (single unreproduced 05-09 note; extraction pipeline reworked since in Hardening + Unified Voice/Chat -- re-test and re-file if it recurs).*

| #1364 | 2026-05-24 | low | Pre-existing test failures on sprint/groups branch: GrammarFocusCeiling case mismatch (b1.json uses "Pluscuamperfecto" but tests asserted "pluscuamperfecto"); fixed in this PR |
