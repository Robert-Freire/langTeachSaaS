# Task 604: StudentForm Difficulty Row Validation

## Issue
#604 - Partial difficulty rows (one of description/competency filled, the other empty) are silently
discarded on save. Teacher loses data without feedback.

## Acceptance Criteria
- Partial row shows inline error on save attempt
- Error message: "Both type and description are required" (or similar)
- Error clears when row is completed or removed
- Fully empty rows still silently ignored
- Complete rows save normally

## Root Cause
`handleSubmit` (line 342-344) filters with `d.competency && d.description.trim()`, silently dropping
partial rows. The `validate()` function (line 327-334) only checks name/language/cefrLevel.

## Implementation Plan

### 1. Validate partial difficulty rows in `validate()`
Add loop after existing field checks:
```
difficulties.forEach((d) => {
  const hasDesc = d.description.trim().length > 0
  const hasCom = d.competency.length > 0
  if ((hasDesc || hasCom) && !(hasDesc && hasCom)) {
    errs[`difficulty-${d.id}`] = 'Both type and description are required'
  }
})
```

### 2. Clear error in `updateDifficulty()`
On any field change, clear the per-row error so it does not persist after the user edits the row.
Error re-appears on next save attempt if still partial.

### 3. Clear error in `removeDifficulty()`
When a row is removed, clear its error key from `errors` state.

### 4. Render inline error below each difficulty row
Wrap each row in `<div className="space-y-1">` and show:
```
{errors[`difficulty-${d.id}`] && (
  <p className="text-xs text-red-600" data-testid="difficulty-error">
    {errors[`difficulty-${d.id}`]}
  </p>
)}
```

## Tests
Add to `StudentForm.test.tsx`:
- Save with only description filled => inline error shown, save blocked
- Save with only competency filled => inline error shown, save blocked  
- Error clears after completing the row
- Error clears after removing the row
- Fully empty row on save => no error, save succeeds
- Complete rows save normally (regression)

## Files Changed
- `frontend/src/pages/StudentForm.tsx`
- `frontend/src/pages/StudentForm.test.tsx`
