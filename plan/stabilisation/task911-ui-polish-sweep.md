# Task #911: UI Polish Sweep

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/911

## Pre-investigation findings (no code change needed)

- **Item 1 (CEFR badge)**: Students.tsx line 518 already uses `CefrBadge` (rounded-md, square). Test already exists.
- **Item 3 (Study View max-width)**: StudyView.tsx already has `max-w-2xl mx-auto`.
- **Item 9 (SavedIndicator)**: Position in the header bar is appropriate for a full-page autosave form. DS §8.2 per-field SavedIndicator applies to inline row edits, not full-page forms.
- **Item 10 (Telegram aria-label)**: TelegramCard already has `aria-label="Copy command"`.

## Changes to implement

### Item 2: Remove 1px borders from LessonEditor section cards
**Files:** `frontend/src/pages/LessonEditor.tsx`
**Change:** Remove `border border-zinc-200` from Card className at lines 385, 397, 650, 724. Cards rely on `bg-white` tonal contrast against `#FBF8FF` main background.

### Item 4: Remap signal badge ad-hoc hex colors to DS tokens
**Files:** `frontend/src/pages/Students.tsx`
**Change:** Replace `bg-[#1A1B22]` with DS-token equivalents:
- "Cancelled 2x": `bg-red-700 text-white` (negative/urgent signal)
- "RETURNING": `bg-indigo-700 text-white` (uses DS primary color family)

### Item 5: Document canonical date format in NextSessionHero
**Files:** `frontend/src/components/dashboard/NextSessionHero.tsx`
**Change:** Add inline comment to `formatLastSessionDate` documenting the chosen format (`{ month: 'short', day: 'numeric' }`) and noting it matches the sessions list section header format.

### Item 6: Onboarding name field — skip email as default
**Files:** `frontend/src/pages/onboarding/OnboardingStep1.tsx`
**Change:** Lines 50-55 — two separate branches both set `displayName` from `user?.name`. Patch both to skip if value looks like an email (contains '@'):
- Line 50: `setDisplayName(profile.displayName || nameFromAuth0)`
- Line 54-55: replace `else if (user?.name)` branch with the same guard

Where `nameFromAuth0 = user?.name && !user.name.includes('@') ? user.name : ''`.

### Item 7: Dashboard hero "FIRST SESSION" for session #1
**Files:** `frontend/src/components/dashboard/NextSessionHero.tsx`
**Change:** Line 113 — if `totalSessionCount === 1`, render "First Session" instead of "Session #1".
```tsx
session.totalSessionCount > 0
  ? (session.totalSessionCount === 1 ? 'First Session' : `Session #${session.totalSessionCount}`)
  : null
```

### Item 8: Duration "other" option — add unit context to label
**Files:** `frontend/src/pages/LogSession.tsx`
**Change:** Line 41 — change `{ value: 'other', label: 'Other' }` to `{ value: 'other', label: 'Other (min)' }`.

### Item 11: Courses progress bar — enforce minimum visible width
**Files:** `frontend/src/pages/Courses.tsx`
**Change:** Add `minWidth` inline style when progress > 0:
```tsx
style={{
  width: `${percent}%`,
  minWidth: course.lessonsCreated > 0 ? '4px' : undefined,
}}
```

### Item 12: "Student Difficulties" read-only visual distinction
**Files:** `frontend/src/pages/LogSession.tsx`
**Change:** Wrap the Student Difficulties `PanelSection` content in a `bg-[#F8F7FF]` tinted container, and add a "(reference)" suffix to the section label to signal it is informational.

## Unit tests

| Item | File | Test |
|------|------|------|
| 7 | NextSessionHero.test.tsx | Renders "First Session" when totalSessionCount is 1; renders "Session #3" when count is 3 |
| 8 | LogSession.test.tsx | DURATION_OPTIONS contains "Other (min)" label |
| 11 | Courses.test.tsx | Progress bar has minWidth 4px when lessonsCreated > 0 |
| 10 | Settings.test.tsx | Telegram copy button has aria-label (verify existing) |

## Files changed
- `frontend/src/pages/LessonEditor.tsx`
- `frontend/src/pages/Students.tsx`
- `frontend/src/components/dashboard/NextSessionHero.tsx`
- `frontend/src/pages/onboarding/OnboardingStep1.tsx`
- `frontend/src/pages/LogSession.tsx`
- `frontend/src/pages/Courses.tsx`
- `frontend/src/components/dashboard/NextSessionHero.test.tsx`
- `frontend/src/pages/Courses.test.tsx`
- `frontend/src/pages/Settings.test.tsx`

## Out of scope
- Redesigning signals or adding new signal types
- Adding new color tokens
- Redesigning study view beyond max-width (already fixed)
- Changing SessionHistoryTab or AppShell
