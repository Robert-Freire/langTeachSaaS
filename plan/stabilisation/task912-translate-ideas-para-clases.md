# Task 912: Translate "IDEAS PARA CLASES" to English

## Problem
The "Ideas para Clases" section heading appeared in Spanish on an English UI (Student Detail Overview tab and Profile tab).

## Change
- `StudentOverviewTab.tsx`: `<SectionHeader>Ideas para Clases</SectionHeader>` → `<SectionHeader>Teaching Ideas</SectionHeader>`
- `StudentProfileTab.tsx`: same heading in the profile tab section
- `StudentProfileTab.test.tsx`: updated matching test description and assertion

## Grep confirmation
No remaining user-facing Spanish strings in `frontend/src/components/student/` or `frontend/src/pages/StudentDetail.tsx`.
