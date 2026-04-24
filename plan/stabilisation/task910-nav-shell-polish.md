# Task #910: Nav Shell Inconsistencies

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/910

## Findings from codebase inspection

The UI detection sweep (`plan/ui-detection-sweep-2026-04-24.md`) captured older screenshots showing three issues. Current code state:

### AC 1: "My Profile" label — ALREADY FIXED
Current `AppShell.tsx:71` uses `label="Settings"` only. `AppShell.test.tsx:121` asserts "My Profile" is not rendered. No action needed.

### AC 3: Generations counter — ALREADY FIXED
`UsageIndicator` component exists but is not imported or mounted in AppShell. `AppShell.test.tsx:98` asserts "does not show generation counter in sidebar". No action needed.

### AC 2: Active item styling — NEEDS FIX
Current active class (AppShell.tsx:32):
```
'bg-white border-l-[3px] border-l-indigo-600 text-indigo-700 rounded-r-md'
```
DS §6: "Active nav item: primary color indicator, **not a background fill**."
`bg-white` is a background fill. Must be removed.

Fixed active class:
```
'border-l-[3px] border-l-indigo-600 text-indigo-700 rounded-r-md'
```

### AC 5: Unit test — MISSING
No existing test checks active item class composition or route-invariant sidebar structure. Need to add.

## Implementation Plan

### Step 1: AppShell.tsx — remove bg-white from active state
Line 32: Remove `bg-white` from the active className string.

### Step 2: AppShell.test.tsx — add unit tests
Two new tests:
1. **Active item has left-border indicator, no background fill**: Render with `/sessions` route, find Sessions link, assert className contains `border-l-indigo-600` and does NOT contain `bg-white` or `bg-indigo`.
2. **Sidebar renders same nav items regardless of route**: Render at `/`, at `/sessions`, at `/settings` — all three must produce the same 6 link labels in the same order.

## Files Changed
- `frontend/src/components/AppShell.tsx`
- `frontend/src/components/AppShell.test.tsx`

## Out of Scope
- Adding generations counter anywhere
- Adding/removing nav items
- Color token changes
