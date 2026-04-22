# Task 773: fix(edit-student): sidebar clips under section nav + Notes/Commercial nav lands on Difficulties

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/773

## Root Causes (pre-diagnosed in issue)

**Bug 1 - Sidebar clipping:** Sidebar uses `lg:top-6` (24px) but the sticky section nav is 49px tall (sticks at top-0), so the sidebar slides under it.

**Bug 2 - Notes/Commercial scroll clamping:** `maxScroll = scrollHeight - clientHeight = 2097px`, but `section-notes` starts at 2405px. `scrollTo()` is clamped and the scrollspy detects Difficulties as active.

## Changes

### `frontend/src/pages/StudentForm.tsx`

1. **Line 1415**: `lg:top-6` → `lg:top-[76px]`
   - 49px (section nav height) + 24px (original gap) + 3px margin = ~76px. Keeps sidebar below section nav.

2. **Line 608**: Add `pb-[600px]` to `<form>` when `isEdit`
   - Increases total scroll height so Notes and Commercial can be scrolled to and pass the 80px scrollspy threshold.

## Testing

- Unit tests: existing snapshot/DOM tests should still pass (CSS-only changes)
- E2E: no new test needed; visual confirmation via review-ui

## Acceptance Criteria

- [ ] Sidebar "TEACHING TODOS" header fully visible when scrolled
- [ ] "Notes" nav link scrolls to and highlights Notes section
- [ ] "Commercial" nav link scrolls to and highlights Commercial section
- [ ] All other section nav links still work correctly
