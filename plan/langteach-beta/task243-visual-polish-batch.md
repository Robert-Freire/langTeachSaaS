# Task 243: Batch Visual Polish

## Goal

Address the three acceptance criteria from issue #243:
1. Hover states and interactive feedback (AC1)
2. Mobile-specific items at 375px viewport (AC2)
3. Consistency items visible in the core teacher workflow (AC3)

## Findings

### AC1: Hover states

| Item | File | Finding |
|------|------|---------|
| "Generate Full Lesson" button | `FullLessonGenerateButton.tsx` | `variant="outline"` uses design-token `hover:bg-muted` which is too subtle |
| "Go back" button | `LessonEditor.tsx:407`, `StudentForm.tsx:333`, `StudyView.tsx:26` | Only `className="underline"`, no hover color |

### AC2: Mobile

| Item | File | Finding |
|------|------|---------|
| Week strip no auto-scroll to today | `WeekStrip.tsx:52` | `overflow-x-auto snap-x` container scrolls but no auto-scroll on mount |
| Study view title wraps / pushes PREVIEW badge | `PageHeader.tsx` | `h1` has no `truncate`; `min-w-0` wrapper is there but does nothing without it |
| Material thumbnail too large on mobile | `MaterialPreview.tsx:56` | `h-12 w-12` (48px) on all breakpoints; should be `h-8 w-8 sm:h-12 sm:w-12` |
| Chip remove button below 44px | `StudentForm.tsx:162-168` | `X className="h-3 w-3"` icon with no padding on the button |

### AC3: Consistency in core teacher workflow

| Item | File | Finding |
|------|------|---------|
| Generate vs Preview buttons inconsistent radius | `FullLessonGenerateButton.tsx` vs `LessonEditor.tsx:510` | Button uses `rounded-lg` (default); Preview uses `rounded-full`; both in same header |
| OnboardingStep2 required fields lack asterisks | `OnboardingStep2.tsx:80,93,107` | Name, learning language, CEFR level are required but have no visual marker |

Note: "Mode badge casing" and "FIB vs MC style mismatch" - after code inspection, styles are already consistent; skipping.
Note: "none" vs "Not specified" - SelectItem displays "Not specified" correctly; no bug found.

## Changes

### 1. `FullLessonGenerateButton.tsx`

Button (line ~175): add `rounded-full hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors` to className.

Rationale: `rounded-full` matches the Preview button in the same header bar. Explicit hover classes override the subtle design-token default.

### 2. `LessonEditor.tsx` (line 407)

"Go back" button: add `hover:text-zinc-700 transition-colors` to className.

### 3. `StudentForm.tsx` (line 333)

"Go back" button: same as above.

### 4. `StudyView.tsx` (line 26)

"Go back" Link: add `hover:text-zinc-700 transition-colors` to className.

### 5. `WeekStrip.tsx`

Add `useRef` for the scroll container. Add `useEffect` (deps: `[weekOffset]`) that, when `weekOffset === 0`, scrolls the today column into view (`scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })`).

Implementation: give each day div a ref (via a ref array), find the today index, scroll it into view within the container. Only on mobile (md breakpoint uses grid, no overflow-x needed).

### 6. `PageHeader.tsx`

Add `truncate` to the `h1` element. The wrapper `div.min-w-0` is already in place; `truncate` activates text overflow ellipsis.

### 7. `MaterialPreview.tsx` (line 56)

Change `h-12 w-12` to `h-8 w-8 sm:h-12 sm:w-12` for the image and the placeholder div at line 62.

### 8. `StudentForm.tsx` - chip remove button (lines 162-168 and 433-440)

Two separate chip remove buttons exist: one for labels/language chips (line 168) and one for interest chips (line 440). Both have `h-3 w-3` X icons with no button padding.

Fix both: Change X icon `h-3 w-3` -> `h-4 w-4`. Add `p-0.5 -mr-0.5` to each button for a larger touch target without changing chip visual width.

### 9. `OnboardingStep2.tsx` (lines 80, 93, 107)

Add `<span className="text-red-500 ml-0.5">*</span>` after each required field label (name, learning language, CEFR level). Native language already labeled "(optional)" so no asterisk.

## Tests

All changes are CSS/className-only except WeekStrip scroll (useRef/useEffect).

Required test additions per project convention (any modified component needs a test):
- **WeekStrip**: add test that when `weekOffset === 0` and today is in the current week, `scrollIntoView` is called on the today column element
- **PageHeader**: add test that a long title renders with the `truncate` class (snapshot or class assertion)
- **MaterialPreview**: verify existing tests still pass; add/verify that the `data-testid="material-thumbnail"` element has the correct responsive classes
- **StudentForm**: existing tests cover chip rendering; verify no regressions from X icon size change

No new API calls, no state changes (except WeekStrip scroll). Existing test suite should pass with the above additions.

## Scope

Skipping (not in AC or too complex for P3:nice):
- CourseNew action buttons position (out of "core teacher workflow" for AC3)
- Courses list 0/N progress bar "Not started" badge
- Required fields in CourseNew
- Logo favicon readability
- "Planned" badge noise
- Spacing/padding harmonization beyond material thumbnail
