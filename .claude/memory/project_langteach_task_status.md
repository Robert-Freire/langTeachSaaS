---
name: LangTeach SaaS — Task Status and Next Steps
description: Sprint branch name, milestone sequence, and pointers to live state. NOT per-issue status (query GitHub for that).
type: project
originSessionId: cdfd3e9b-4731-4ad7-8679-11c1de9c3545
---
## In-Flight Tasks (2026-04-21)

| Task | Issue | PR | Status |
|------|-------|----|--------|
| t826 | #826 ExtractionMode enum refactor | #831 | PR open, CI pending |
| t824 | #824 Future session SCHEDULED badge | #828 | MERGED |
| t823 | #823 Voice note extraction append/replace/skip mode | #827 | PR open, CI pending |
| t725 | #725 Edit Student autosave | #743 | MERGED |
| t726 | #726 Edit Student Stitch visual alignment | #744 | MERGED |
| t729 | #729 Replace Edit Session modal with Log Session edit mode | #750 | PR open, CI PASS |
| t723 | #723 Log Session form data quality (auto-title, topics, suggestions) | #751 | PR open, CI pending |
| t730 | #730 Dashboard polish - hero CTA, roster signals, followup urgency | #748 | PR open, CI pending |
| t731 | #731 Sidebar Settings separation and generation counter cleanup | #749 | MERGED |
| t733 | #733 Standardize URL-driven tab state across multi-tab pages | #752 | PR open, CI pending |
| t742 | #742 useMutation for useStudentAutosave | #758 | PR open, CI pending |
| t771 | #771 Student detail interaction standard | #777 | PR open, CI pending |
| t775 | #775 Edit Student layout + interaction polish | #784 | PR open, CI pending |
| t778 | #778 Log session nav, autosave, timestamps | #785 | PR open, CI pending |
| t793 | #793 Dashboard UX polish: roster click, followup nav, hero identity | #798 | PR open, CI pending |
| t799 | #799 Edit Student + Log Session Stitch alignment polish | #803 | MERGED |
| t797 | #797 Student Detail: header density, badge styling, session titles, border cleanup | #802 | MERGED |

## Live Tracker: GitHub Issues

GitHub Issues is the single source of truth for task tracking.
**Never trust this file for per-issue status. Always query GitHub.**

Key queries:
- Current sprint issues: `gh issue list --milestone "<milestone-name>" --state open`
- Must-haves: `gh issue list --milestone "<milestone-name>" --label "P1:must" --state open`
- Ready to pick up: `gh issue list --milestone "<milestone-name>" --label "qa:ready" --state open`

**Active sprint branch:** `sprint/ui-redesign-student-polish`
Agents must PR against this branch, not `main`. See CLAUDE.md "Sprint Branch Workflow" section.

## Milestone Sequence (newest first)

| Milestone | Status | Notes |
|-----------|--------|-------|
| UI Redesign & Student Profile Polish | ACTIVE 2026-04-08 | milestone #16, sprint/ui-redesign-student-polish |
| Adaptive Replanning | CLOSED 2026-04-08 | 22/22 done, merged to main |
| Post-Class Tracking | CLOSED 2026-04-04 | 23/23 done, merged to main |
| Pedagogical Quality | CLOSED 2026-04-02 | 35/35 done, merged to main |
| Student-Aware Curriculum | CLOSED 2026-03-29 | merged to main |
| Pedagogical Credibility | CLOSED | merged into Student-Aware Curriculum |
| Curriculum & Personalization | CLOSED 2026-03-24 | 35/35 done, merged to main |
| Phase 2A: Teacher Workflow | CLOSED 2026-03-21 | reorganized |
| Demo 1 (internal) | CLOSED | |

## Upcoming Milestones (not yet started)

- Listening Comprehension: after UI Redesign
- Solo Whiteboard: after Listening Comprehension
- Group Classes: FUTURE
- Phase 2B: Production (caching, usage limits, CI pipeline)
- Phase 3: Growth (student portal, evaluation, content library, payments)

## Task Numbering Convention

Tasks are numbered sequentially within a phase. Branch naming: `task/t<N>-<short-description>`.

## Key Architectural Notes

- Azure Container Apps (not App Service), North Europe region, SWA in West Europe
- ACR: `crlangteachdev.azurecr.io`, OIDC auth (not SP secret)
- Content blocks are typed (vocabulary, exercises, conversation, reading, grammar, homework, freeText, errorCorrection, noticingTask, guidedWriting) with per-type renderers
- Mock-auth e2e: ASPNETCORE_ENVIRONMENT=E2ETesting, VITE_E2E_TEST_MODE=true
- Student->Lesson FK is NoAction (SQL Server cascade constraint)
- Deploy freeze: primary mechanism is sprint branch workflow (don't trigger merge action); secondary is DEPLOY_FROZEN repo variable

## Production Incidents

### 2026-03-22: API ActivationFailed (issue #217, resolved)
- **Root cause:** `AzureBlobStorage--ConnectionString` secret missing from Key Vault.
- **Lesson:** When adding a service that reads from Key Vault, ensure the secret is provisioned.
