# Task 334: Expose section profiles API and remove frontend copy

## Status: Mostly done by prior PRs — one gap remains

## Acceptance Criteria Audit

| AC | Status | Evidence |
|----|--------|----------|
| AC1: GET /api/section-profiles endpoint | DONE | `/api/pedagogy/section-rules` in PedagogyController.cs (PR #326) |
| AC2: PromptService reads duration from profiles | DONE | `_profiles.GetDuration()` at lines 492, 630 (PR #351) |
| AC3: Frontend uses API not hardcoded copy | DONE | `useSectionRules` hook + `fetchSectionRules()` (PR #326) |
| AC4: Hardcoded switch deleted | DONE | No switch in sectionContentTypes.ts |
| AC5: Backend unit tests | DONE | 3 tests in PedagogyControllerTests.cs |
| AC6: Frontend unit tests | PARTIAL — mock data stale (see below) |
| AC7: E2e tests pass | Verify via task-build-verify |

## The Gap: Stale Frontend Test Mocks

`production.json` was updated in PR #358 (content-type-constraints) to include `exercises` for B1/B2/C1/C2. The frontend test mocks were not updated to reflect this.

### Actual production.json content types
- A1: `['conversation']`
- A2: `['conversation']`
- B1: `['conversation', 'exercises']`  ← exercises added in #358
- B2: `['conversation', 'reading', 'exercises']`  ← exercises added in #358
- C1: `['conversation', 'reading', 'exercises']`  ← exercises added in #358
- C2: `['conversation', 'reading', 'exercises']`  ← exercises added in #358

### Files to fix
1. `frontend/src/utils/sectionContentTypes.test.ts`
   - Update MOCK_RULES Production section to add exercises for B1-C2
   - Fix "returns only conversation for B1" test (wrong: should be conversation + exercises)
   - Fix "returns conversation and reading for B2" test (wrong: should include exercises)
   - Fix "excludes exercises from Production" test (wrong: exercises IS in Production B1+)

2. `frontend/src/components/lesson/GeneratePanel.test.tsx`
   - Update MOCK_SECTION_RULES Production section to add exercises for B1-C2

## Implementation

Two files, pure test updates, no production code changes needed.
