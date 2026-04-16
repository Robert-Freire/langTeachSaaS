# Task 768: Student roster polish

Issue: https://github.com/Robert-Freire/langTeachSaaS/issues/768
Branch: worktree-task-t768-student-roster-polish

## Acceptance Criteria

1. Search input: fix keystroke loss under real-time URL sync
2. Row click zone: constrain onClick to row height (Load More no longer captured by row handler)
3. CEFR badge padding: px-1.5 to px-2 (already px-2 in current code, confirmed no change needed)

## Analysis

### AC1: Search keystroke loss
Current: `value={searchQuery}` where `searchQuery = searchParams.get('q')`. Every keystroke calls
`updateParam` which calls `setSearchParams`, triggering a re-render that can steal focus.

Fix:
- Add `const [localSearch, setLocalSearch] = useState(() => searchParams.get('q') ?? '')`
- Add `useEffect` that debounces URL sync 300ms after `localSearch` changes
- Input binds to `localSearch`, onChange calls `setLocalSearch`
- Filter logic and subtitle read from `localSearch` (immediate, no debounce)

### AC2: Row click bleed
Current: Load More button uses `absolute left-1/2 -translate-x-1/2` inside a `relative` footer div.
This can cause overlap with the rows above in certain scroll/layout states.

Fix: Replace absolute positioning with CSS grid layout in the footer:
`grid-cols-[1fr_auto_1fr]` places count text in col 1, Load More in col 2 (centered), spacer in col 3.
Eliminates absolute positioning entirely.

### AC3: CEFR badge padding
CefrBadge.tsx already has `px-2 py-0.5`. No change required.

## Files Changed

- `frontend/src/pages/Students.tsx` - search debounce + footer grid layout
