# Task 326: Update frontend section content type rules (data-driven from backend)

## Issue
#326 — Replace hardcoded `sectionContentTypes.ts` switch with data-driven rules from backend section profiles.

## Decision: API Endpoint

Chosen approach: `GET /api/pedagogy/section-rules` returning all section+level rules in one call.

Rationale:
- Backend already owns the data (embedded JSON profiles); single source of truth stays there
- React Query caches the result for the session; after first render there is no round-trip cost
- Consistent with how other configuration endpoints (lesson-templates, curriculum-templates) work
- Build-time generation would require a generation step and risk drift from the runtime data

## What Changes

### Backend — new controller
`backend/LangTeach.Api/Controllers/PedagogyController.cs`
- `[Authorize]` (consistent with all other controllers)
- `GET /api/pedagogy/section-rules`
- Injects `ISectionProfileService`
- Iterates over known section types (WarmUp, Presentation, Practice, Production, WrapUp) and all CEFR levels (A1–C2)
- Returns `Dictionary<string, Dictionary<string, string[]>>` — `{ sectionType -> { cefrLevel -> contentTypes[] } }`
- No new DTOs needed (plain JSON dictionary)

### Backend — unit test
`backend/LangTeach.Api.Tests/Controllers/PedagogyControllerTests.cs`
- Mocks `ISectionProfileService`
- Verifies endpoint returns correct structure and calls `GetAllowedContentTypes` for each section+level

### Frontend — API layer
`frontend/src/api/pedagogy.ts` (new file)
- `export type SectionRulesMap = Record<string, Record<string, ContentBlockType[]>>`
- `export async function fetchSectionRules(): Promise<SectionRulesMap>` — GET `/api/pedagogy/section-rules`

### Frontend — hook
`frontend/src/hooks/useSectionRules.ts` (new file)
- `export function useSectionRules()` — React Query, staleTime: Infinity (rules never change at runtime)
- Returns `{ data: SectionRulesMap | undefined, isLoading: boolean }`

### Frontend — sectionContentTypes.ts
- Export `SectionRulesMap` type (re-export from `api/pedagogy.ts`)
- Remove hardcoded switch from `getAllowedContentTypes`
- New signature: `getAllowedContentTypes(rules: SectionRulesMap | undefined, sectionType: SectionType, cefrLevel: string): ContentBlockType[]`
- Implementation:
  - When `rules === undefined` (loading): return `ALL_CONTENT_TYPES` (all 7 types) — ensures `allowedTypes[0]` is always defined during loading
  - When rules are loaded: return `rules[sectionType]?.[normalizeLevel(cefrLevel)] ?? []`
- Export `ALL_CONTENT_TYPES: ContentBlockType[]` constant (used by tests and as fallback)
- Add `normalizeLevel(cefrLevel: string): string` helper — strips trailing ".N" (e.g. "B2.1" -> "B2")
- Keep `getContentTypeLabel` and `SECTION_CONTENT_TYPE_LABELS` unchanged

### Frontend — GeneratePanel.tsx
- Import `useSectionRules`
- Call `const { data: sectionRules } = useSectionRules()` in component body
- Pass `sectionRules` to `getAllowedContentTypes(sectionRules, sectionType, lessonContext.cefrLevel)`
- When `sectionRules` is undefined (loading): `getAllowedContentTypes` returns `ALL_CONTENT_TYPES`, so `allowedTypes[0]` is always a valid content type — no undefined taskType risk

### Frontend — tests
`sectionContentTypes.test.ts`:
- Define `MOCK_RULES: SectionRulesMap` with the actual data from section profile JSONs (5 sections x 6 levels)
- Update all `getAllowedContentTypes(...)` calls to pass `MOCK_RULES` as first argument
- Update "unknown section" test: expect `[]` (not the full list) when rules are loaded but section not found — behavior change, explicitly documented
- Add test: `undefined` rules returns `ALL_CONTENT_TYPES` (loading fallback)
- Add tests for `normalizeLevel` helper

`GeneratePanel.test.tsx`:
- Add at file top: `vi.mock('../../hooks/useSectionRules', () => ({ useSectionRules: () => ({ data: MOCK_RULES, isLoading: false }) }))` with `MOCK_RULES` covering all 5 sections x 6 levels
- Add `MOCK_RULES` constant at top of test file
- Existing tests in `beforeEach` already set up profile mock; `useSectionRules` mock is at module level so all existing tests get valid rules without changes to individual test cases

## Files Modified
- `backend/LangTeach.Api/Controllers/PedagogyController.cs` (new)
- `backend/LangTeach.Api.Tests/Controllers/PedagogyControllerTests.cs` (new)
- `frontend/src/api/pedagogy.ts` (new)
- `frontend/src/hooks/useSectionRules.ts` (new)
- `frontend/src/utils/sectionContentTypes.ts` (modified — remove switch, new signature)
- `frontend/src/utils/sectionContentTypes.test.ts` (updated — pass rules map)
- `frontend/src/components/lesson/GeneratePanel.tsx` (updated — use hook)
- `frontend/src/components/lesson/GeneratePanel.test.tsx` (updated — mock hook)

## Out of Scope
- Updating `SectionProfileService` or any pedagogy JSON files (data is already correct)
- E2E test changes (dropdown filtering behavior unchanged)
- The `getContentTypeLabel` logic (no data-driven equivalent needed; it's UI label overrides only)
