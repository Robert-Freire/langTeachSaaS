# Task 644: Unify CEFR Badge System

## Issue
[#644](https://github.com/Robert-Freire/langTeachSaaS/issues/644) - refactor: unify CEFR badge system (Stitch vs legacy colors)

## Goal
Replace all CEFR badge usages with the canonical `CefrBadge` component from `frontend/src/components/dashboard/CefrBadge.tsx`. Remove legacy functions `getCefrBadgeClasses` and `getCefrStitchBadgeClasses` from `cefr-colors.ts`.

## Current State

### Two legacy functions in `cefr-colors.ts`
- `getCefrBadgeClasses()` - emerald/indigo/purple colors, used with shadcn `<Badge variant="outline">` in LessonEditor and Lessons pages
- `getCefrStitchBadgeClasses()` - sky/indigo/slate Tailwind colors, used with inline `<span>` styling in StudentDetail and Students pages

### Canonical component
`CefrBadge` in `frontend/src/components/dashboard/CefrBadge.tsx` - uses hex colors from Stitch design spec (#DDE8F5, #ECEAFD, #F8E9D6), square/rounded-md format.

### Files to change

| File | Current usage | Change needed |
|------|--------------|---------------|
| `pages/LessonEditor.tsx:611` | `<Badge variant="outline" className={getCefrBadgeClasses(...)}>{lesson.cefrLevel}</Badge>` | Replace with `<CefrBadge level={lesson.cefrLevel} />` |
| `pages/Lessons.tsx:249` | `<Badge variant="outline" className={getCefrBadgeClasses(...)}>{lesson.cefrLevel}</Badge>` | Replace with `<CefrBadge level={lesson.cefrLevel} />` |
| `pages/StudentDetail.tsx:148` | inline span + `getCefrStitchBadgeClasses(student.cefrLevel.substring(0,2))` | Replace with `<CefrBadge level={student.cefrLevel} />` |
| `pages/StudentDetail.tsx:157` | inline span + `getCefrStitchBadgeClasses(student.officialCefrLevel.substring(0,2))` | Replace with `<CefrBadge level={student.officialCefrLevel} />` |
| `pages/Students.tsx:246` | inline span + `getCefrStitchBadgeClasses(student.cefrLevel)` | Replace with `<CefrBadge level={student.cefrLevel} />` |

Note: `StudentDetail.tsx` uses `.substring(0, 2)` to normalize e.g. "A1-A2" to "A1". `CefrBadge.cefrColors` only reads `level[0]`, so passing the full level string works directly without substring.

### Files to remove/update
- `cefr-colors.ts`: Remove `getCefrBadgeClasses` and `getCefrStitchBadgeClasses`; keep `getCefrGap` and `CEFR_LEVELS`
- `cefr-colors.test.ts`: Remove `getCefrBadgeClasses` describe block; keep `getCefrGap` tests
- `CefrBadge.test.tsx`: Verify/extend to cover the badge rendering

## Implementation Steps

1. Update `pages/LessonEditor.tsx`: import `CefrBadge`, replace usage. Note: `Badge` import is still needed for the adjacent language badge on line 612 - do not remove it.
2. Update `pages/Lessons.tsx`: same pattern
3. Update `pages/StudentDetail.tsx`: import `CefrBadge`, replace both inline spans
4. Update `pages/Students.tsx`: import `CefrBadge`, replace inline span (note: `data-testid="student-level"` must be preserved on the `<CefrBadge>` via `className` or by wrapping)
5. Remove `getCefrBadgeClasses` and `getCefrStitchBadgeClasses` from `cefr-colors.ts`
6. Update `cefr-colors.test.ts`: remove deleted function tests
7. Verify `CefrBadge.test.tsx` covers all three CEFR groups

## `data-testid` preservation

`Students.tsx` has `data-testid="student-level"` on the badge span. The `CefrBadge` component accepts `className` but not arbitrary props. Options:
- Wrap `<CefrBadge>` in a `<span data-testid="student-level">` (adds DOM nesting)
- Add `data-testid` prop to `CefrBadge` interface

Preferred: add optional `data-testid` prop to `CefrBadge` to avoid extra wrapper nesting.

`CefrBadge.test.tsx` must include a test case asserting `data-testid` renders correctly when passed.

## E2E Coverage

The e2e tests for Students list use `data-testid="student-level"` - verify these still pass.
Existing Vitest unit tests in `CefrBadge.test.tsx` cover rendering.

## Acceptance Criteria Check

- [x] Single CEFR badge implementation (`CefrBadge`) across all screens
- [x] `getCefrBadgeClasses()` removed
- [x] `getCefrStitchBadgeClasses()` removed (it's also legacy - design spec says CefrBadge is canonical)
- [x] `getCefrGap()` retained and still functional
- [x] No legacy emerald/purple CEFR colors in codebase
- [x] All screens rendering consistently (square format, Stitch palette)
- [x] Existing e2e and visual tests pass
