# Task 814: Add 25 and 50 min duration options to Log Session

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/814

## Summary
Add 25 min and 50 min to the Log Session duration dropdown and change the default from 60 to 50 min.

## Acceptance Criteria
- [x] Duration dropdown options: 25, 30, 45, 50, 60, 90 min, Other (in that order)
- [x] Default selection in create mode is 50 min
- [x] Edit mode pre-selects stored duration correctly for all values including 25 and 50
- [x] "Other" custom input still works for any duration not in the list

## Implementation

### Changes
- `frontend/src/pages/LogSession.tsx`:
  - `DURATION_OPTIONS`: added `{ value: '25', label: '25 min' }` and `{ value: '50', label: '50 min' }`
  - `useState('60')` -> `useState('50')` for default durationChoice
  - Edit-mode guard updated: `dur === 25 || ... || dur === 50 || ...`

- `frontend/src/pages/LogSession.test.tsx`:
  - Updated "defaults to 60" test to "defaults to 50"
  - Added test: "duration dropdown includes 25 and 50 min options"
