# Task 111: Dashboard Loading Skeletons

## Problem
Dashboard renders empty state during API loading (especially Azure cold starts), making users think their data is lost. Other pages (Lessons, Students) correctly show skeleton loaders.

## Approach
Modify `Dashboard.tsx` to:

1. **Track loading state**: Extract `isLoading` from all 6 `useQuery` hooks. Consider the dashboard "loading" if ANY primary query is still in-flight.
2. **Skeleton layout**: Return a skeleton UI matching the dashboard structure (header, week strip area, quick actions sidebar, needs preparation section, unscheduled drafts).
3. **Slow connection message**: Use a `useState` + `useEffect` timer. If loading persists >5s, overlay a "Still connecting..." message on the skeleton.
4. **Pattern**: Follow the existing pattern from `Lessons.tsx` (early return with skeleton when `isLoading`).

## Files Changed
- `frontend/src/pages/Dashboard.tsx` (main change)
- `frontend/src/pages/Dashboard.test.tsx` (new unit test)

## Skeleton Layout Structure
```
[h-7 w-40]         <- "Dashboard" title
[h-4 w-56]         <- subtitle

[grid 3+1 cols]
  [col-span-3]
    [h-48 card]     <- WeekStrip skeleton (calendar area)
    [h-32 card]     <- NeedsPreparation skeleton (2 rows)
  [col-span-1]
    [3x h-16 cards] <- QuickActions skeleton (3 stat cards)

[h-24 card]         <- UnscheduledDrafts skeleton
```

## Acceptance Criteria Mapping
- Skeletons while API in-flight: loading state check + skeleton return
- Empty state only after API responds with zero: existing behavior preserved (only reached when isLoading=false)
- Consistent with other screens: same Skeleton component, same pattern
- Friendly message after >5s: timer-based "Still connecting" overlay
