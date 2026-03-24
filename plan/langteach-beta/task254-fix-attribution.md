# Task #254 — Fix curriculum template attribution: not Instituto Cervantes

## Problem
The UI checkbox says "Use Instituto Cervantes curriculum template" but the data is NOT from Instituto Cervantes. It's from Jordi's academy and an internet source (clarified 2026-03-21 email). Displaying "Instituto Cervantes" is a misattribution that undermines credibility.

## Scope of changes

**User-visible (must fix):**
1. `frontend/src/pages/CourseNew.tsx:205` — rename checkbox label to "Use structured curriculum template"
2. `e2e/tests/courses.spec.ts:274` — rename test to match new label

**Not user-visible (no action):**
- `.claude/memory/` — historical references, fine to leave
- `plan/` — design docs, no impact on users
- No JSON data files or C# files reference "Instituto Cervantes"

## Implementation

Simple text replacement in 2 files. No logic changes.

## Acceptance Criteria (from issue)
- [x] UI checkbox no longer says "Instituto Cervantes"
- [x] No user-visible references to "Instituto Cervantes" remain in the app
- [x] Data file metadata updated if it references Instituto Cervantes (N/A - no data files affected)
