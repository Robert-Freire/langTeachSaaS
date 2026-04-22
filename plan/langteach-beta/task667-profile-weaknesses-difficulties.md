# Task 667 — Fix: Profile View Display Gaps (Weaknesses & Difficulties)

## Goal
Render Weaknesses and Difficulties in the StudentProfileTab with the correct format per Stitch design.

## Changes

### StudentProfileTab.tsx
1. Remove old `profile-difficulties` section from right column
2. Add "Focus Areas & Difficulties" section (`profile-focus-areas`) to LEFT column, after Pedagogical Diagnostic, before notes
3. Difficulties render as table: Area (competency) | Subcategory (description) | Trend | Status
   - Trend: capitalize first letter of model value (stable -> Stable, etc.)
   - Status: 'Active' displays as "Working", 'Covered' displays as "Covered"
   - Toggle button kept in Status column (existing prop/testid preserved)
4. Weaknesses render below Difficulties with category badges (Grammatical/Lexical/Orthographic)
5. Empty state only when both arrays are empty

### StudentProfileTab.test.tsx
1. Update EMPTY_STUDENT to include `weaknesses: []`
2. Update "Difficulties section" describe: remove severity/line-through assertions, add new format assertions
3. Add "Weaknesses section" describe with badge/description tests
4. Add combined empty state test

## Acceptance Criteria
- [x] Weaknesses render with category badges
- [x] Difficulties as table: Area, Subcategory, Trend, Status
- [x] Trend: Stable/Improving/Regressing vocabulary
- [x] Status: Working/Covered vocabulary
- [x] Empty state only when both empty
- [x] Section in left column per Stitch design

## Seed data
Ana Visual: 2 weaknesses (grammatical, lexical) + 3 difficulties
