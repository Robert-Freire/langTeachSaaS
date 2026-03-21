# Task 162: Generate All button hardcodes '5 sections'

## Problem
The "Generate All" confirmation dialog says "all 5 sections" regardless of actual section count.

## Fix
- Move `activeSections` computation out of `handleConfirm` to component body (already used in render)
- Replace hardcoded `'5 sections'` with template literal using `activeSections.length`
- Add unit test verifying dynamic count with 3 sections

## Files changed
- `frontend/src/components/lesson/FullLessonGenerateButton.tsx` (line 180)
- `frontend/src/components/lesson/FullLessonGenerateButton.test.tsx` (new test case)
