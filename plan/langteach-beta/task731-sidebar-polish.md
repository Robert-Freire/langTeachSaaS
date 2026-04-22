# Task 731: Sidebar Settings separation and generation counter cleanup

## Issue
GitHub #731 - P2:should, area:frontend, qa:ready

## Acceptance Criteria
1. Settings separated from main nav (pinned at bottom with visual border-t separator)
2. Generation counter ("X / Y generations") removed from sidebar
3. Log out tucked into teacher profile card as an icon button

## Files to change
- `frontend/src/components/AppShell.tsx` - main implementation
- `frontend/src/components/AppShell.test.tsx` - update/add tests

## Implementation Plan

### AppShell.tsx
- Split `navItems` into `mainNavItems` (Dashboard, Students, Sessions, Courses, Lessons) - Settings removed
- Remove `<UsageIndicator />` render and import
- Add Settings link in a new bottom section with `border-t border-zinc-200/60 pt-3` separator above the profile card
- Replace standalone logout button with an icon-only `LogOut` button tucked inside the profile card (right side, `aria-label="Log out"`)

### AppShell.test.tsx
- Existing tests should still pass (Settings link is still a `<a>` in the aside, DOM order preserved)
- Add: "generation counter not shown in sidebar"
- Add: "Settings link is not inside the main nav element"
- Add: "logout button is inside profile card and calls logout"

## Out of scope
- Contextual sidebar CTAs
- Brand name changes
- Vertical spacing between nav items
- Changes to UsageIndicator component logic (display only, remove from sidebar)
