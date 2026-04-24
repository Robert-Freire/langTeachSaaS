# Task 908: Student Detail Header — Stabilize Content Across Tabs and Viewports

## Problem

The Student Detail header renders inconsistently across tabs and viewports.
Root cause from UI sweep (Mi6 / Systemic #7):
- At some wide viewports, the header on the Profile tab shows only avatar + name + CEFR badge + language subtitle, with status pills, session count, and GOAL row missing.
- At narrow viewport (~920px), sections reflow — not just stack — between columns.
- There is no dedicated `StudentDetailHeader` component; the header JSX lives inline in `StudentDetail.tsx`.

Current code analysis:
- The header card is already rendered outside the tab components (lines 304-426 of `StudentDetail.tsx`), so it is never re-mounted on tab switch. The content is logically consistent.
- The visual discrepancy is a CSS layout issue: at narrow widths the outer `flex items-start justify-between gap-4` container allows the left side (`min-w-0`) to be squeezed by the action buttons, potentially hiding wrapped pill rows.
- At mobile (375px), the two action buttons (~240px combined) compete with the avatar + text content inside a 335px available area.

## Implementation Plan

### 1. Extract `StudentDetailHeader` component

New file: `frontend/src/components/student/StudentDetailHeader.tsx`

Move from `StudentDetail.tsx`:
- `buildIdentitySubtitle()` helper
- `HeaderObjective` component
- The header card JSX (lines 304-426)

Props interface:
```ts
interface StudentDetailHeaderProps {
  student: Student
  nextSession: SessionLog | null
  sessionFrequency: string | null
}
```

(`calcSessionFrequency` stays in `StudentDetail.tsx` since it needs `sessions[]`; the result is passed in as `sessionFrequency`.)

### 2. Fix responsive layout

Current outer container:
```jsx
<div className="flex items-start justify-between gap-4">
```

Change to:
```jsx
<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
```

This ensures:
- At < 768px: content stacks vertically (action buttons go below the avatar/text block)
- At >= 768px: side-by-side layout is preserved

The inner text content (status pills, session frequency, goal) already uses `flex-wrap` so it handles narrow widths correctly once the action buttons aren't competing for horizontal space.

### 3. Update `StudentDetail.tsx`

- Import `StudentDetailHeader`
- Remove the inline header card JSX
- Call: `<StudentDetailHeader student={student} nextSession={nextSession} sessionFrequency={sessionFrequency} />`

### 4. New unit test: `StudentDetailHeader.test.tsx`

Key cases to cover:
- Renders name, CEFR badge, subtitle, status badges, and goal for a fully-populated student
- Active student shows Active + Private/Corporate badges
- Inactive student shows Inactive badge only (no type badge)
- With `nextSession` prop: next-session pill is visible
- Without `nextSession` prop: next-session pill absent
- With `sessionFrequency` prop: frequency indicator visible
- Without shortTermObjectives: goal row absent

The AC says "Unit test verifies the header renders the same elements regardless of the active tab prop." Since `StudentDetailHeader` has no `activeTab` prop (it's tab-agnostic by design), this is verified by the existing `StudentDetail.test.tsx` tests (`header badges persist after switching tabs`, `objective card persists when switching tabs`). The new component test proves the elements are always rendered regardless of the data configuration.

### 5. Update visual spec `student-detail.visual.spec.ts`

Add 5 new spec cases. Each navigates to a tab and asserts the header elements are visible, then takes a screenshot.

- `@visual header stable - overview tab 1280px` — assert status badge, name, subtitle visible on overview tab
- `@visual header stable - profile tab 1280px` — switch to profile, assert same header elements visible
- `@visual header stable - progress tab 1280px` — switch to progress, assert same
- `@visual header stable - sessions tab 1280px` — switch to sessions, assert same
- `@visual header stable - profile tab 375px` — set viewport to 375px, switch to profile, assert no header element is hidden

Use `studentWithSessionsId` (Diego Seed) for session count / frequency visibility.

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/student/StudentDetailHeader.tsx` | NEW — extracted component |
| `frontend/src/components/student/StudentDetailHeader.test.tsx` | NEW — unit tests |
| `frontend/src/pages/StudentDetail.tsx` | Remove inline header JSX, use new component |
| `e2e/tests/visual/student-detail.visual.spec.ts` | Add 5 header-stability specs |

No backend changes. No new API calls. No new data fields.
