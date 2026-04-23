# Task 849: UI Labeling Inconsistencies

## Changes

1. **Settings page H1**: `Settings.tsx` - `title="My Profile"` → `title="Settings"`
2. **T-ENGLISH tooltip**: `StudentOverviewTab.tsx` - wrapped target-language-tag span with `Tooltip/TooltipTrigger/TooltipContent`; text: "Target language: this student is being taught in {language}"
3. **Dashboard subtitle casing**: `Dashboard.tsx` - removed `uppercase` class from subtitle paragraph

## Tests updated
- `e2e/tests/dashboard.spec.ts` - h1 assertion changed to "Settings"
- `e2e/tests/teacher-profile.spec.ts` - h1 assertion changed to "Settings"
- `frontend/src/components/student/StudentOverviewTab.test.tsx` - added tooltip hover test
