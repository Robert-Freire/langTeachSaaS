# Task 337 — Minor Codebase Cleanup

**Issue:** #337
**Branch:** worktree-task-t337-codebase-cleanup
**Sprint:** sprint/pedagogical-quality

## Findings Status After Sprint Sync

| # | Finding | Status |
|---|---------|--------|
| M1 | API function declaration styles | **Needs fix** |
| M2 | Date formatting duplication | **Needs fix** |
| M3 | Section type naming convention | **Needs documentation comment** |
| M4 | `ReadingQuestion.type` as `string` | **Needs fix** |
| M5 | Section count validation duplication | **Already resolved** (PR #336/#365 cleaned up GenerateController; only one validation block remains) |

---

## M1: Standardize API function declaration styles

**Current state:**
- `profileApi.ts`: arrow functions with `.then()` chaining
- `generate.ts`: regular `function` declarations with `.then()` chaining
- All other files (`students.ts`, `lessons.ts`, `courses.ts`, `curricula.ts`, `pedagogy.ts`): `async function` + `await`

**Canonical style:** `async function` + `await` (used by 7 of 9 API modules)

**Changes:**
1. `frontend/src/api/profileApi.ts`: Convert 3 arrow+then functions to `async function`
2. `frontend/src/api/generate.ts`: Convert 5 regular+then functions to `async function`

---

## M2: Shared `formatDate` utility

**Current state — 4 inline instances:**
- `frontend/src/pages/Lessons.tsx:36`: local private helper `function formatDate(iso)` with `{ month: 'short', day: 'numeric', year: 'numeric' }`
- `frontend/src/pages/LessonEditor.tsx:580`: inline JSX with `{ weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }` (uses `toLocaleDateString` with time options; replaced with `toLocaleString`-based `formatDateTime` which is spec-correct)
- `frontend/src/components/dashboard/NeedsPreparation.tsx:48`: inline JSX with `{ weekday: 'short', month: 'short', day: 'numeric' }`
- `frontend/src/components/student/LessonHistoryCard.tsx:65`: inline JSX with `{ year: 'numeric', month: 'short', day: 'numeric' }`

**Fix:** Create `frontend/src/utils/formatDate.ts` with:
- `formatDate(iso: string): string` — short date: `{ month: 'short', day: 'numeric', year: 'numeric' }`
- `formatDateShort(iso: string): string` — no year: `{ weekday: 'short', month: 'short', day: 'numeric' }`
- `formatDateTime(iso: string): string` — with time: `{ weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }`

Replace all 4 inline instances.

Note: `date-time-picker.tsx:21` formats a `Date` object (not ISO string) with `toLocaleString` for input display — this is a different use case and is left as-is.

---

## M3: Document section type naming convention

**Current state:** Three conventions coexist but are already handled by `SectionProfileService.cs`:
- API/transport/frontend: PascalCase (`WarmUp`, `Presentation`, etc.)
- Section profile JSON files: lowercase (`warmup`, `presentation`, etc.)
- `SectionProfileService.GetProfile()` normalizes via `.ToLowerInvariant()` before lookup

**Fix:** Add a comment in `SectionProfileService.cs` at the `GetProfile` private method and at the class level documenting:
- Canonical = PascalCase (C# enum, API transport, frontend TypeScript union)
- JSON profile files use lowercase keys (normalized on lookup)

---

## M4: `ReadingQuestion.type` union type

**File:** `frontend/src/types/contentTypes.ts:125`

**Change:**
```ts
// Before
type: string

// After
type: 'factual' | 'inferential' | 'vocabulary'
```

No runtime behavior change. This tightens static analysis only.

---

## M5: Section count validation (no action needed)

The duplication reported in the issue (lines 361-387 and 417-449) no longer exists. It was resolved in a previous sprint PR. Only one validation block remains in `GenerateController.cs`. No changes needed.

---

## Implementation Order

1. M4 (1 line, lowest risk)
2. M3 (comment-only, no behavior change)
3. M1 (convert 8 functions, no behavior change)
4. M2 (create utility + update 4 files)

## Tests

- All existing frontend tests must pass (`npm test`)
- All existing backend tests must pass (`dotnet test`)
- No new tests needed (pure refactor/type tightening with no behavior change)
- `ReadingQuestion.type` change: verify no test fixture uses a string outside the union
