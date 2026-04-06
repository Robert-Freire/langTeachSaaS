# Task 550 — Students Infinite Scroll

## Issue
#550 — Students screen caps at 20, no pagination or load-more.

## Type
Hotfix. Branch from `main`, PR to `main`.

## Analysis

### Backend: Already done
- `StudentListQuery` has `Page` (default 1) and `PageSize` (default 20, max 100).
- `StudentService.ListAsync` applies `Skip((page-1)*pageSize).Take(pageSize)` and returns `PagedResult<StudentDto>` with `TotalCount`, `Page`, `PageSize`.
- No backend changes needed.

### Frontend API: Already done
- `getStudents({ page?, pageSize? })` passes params to `GET /api/students`.
- `StudentListResponse` already has `page`, `pageSize`, `totalCount`.

### Frontend page: Needs fix
- `Students.tsx` uses `useQuery` with no `page` param — always fetches page 1.
- Fix: switch to `useInfiniteQuery`, add IntersectionObserver sentinel.

## Changes

### 1. `frontend/src/pages/Students.tsx`
- Replace `useQuery` with `useInfiniteQuery`
- `queryFn: ({ pageParam }) => getStudents({ page: pageParam })`
- `initialPageParam: 1`
- `getNextPageParam: (lastPage) => lastPage.page * lastPage.pageSize < lastPage.totalCount ? lastPage.page + 1 : undefined`
- Flatten: `data?.pages.flatMap(p => p.items) ?? []`
- Add `useRef<HTMLDivElement>` sentinel + `useEffect` with `IntersectionObserver`
- Show `Loader2` spinner when `isFetchingNextPage`
- `data-testid="scroll-sentinel"` on sentinel div, `data-testid="fetch-next-loading"` on spinner

### 2. `frontend/src/test/setup.ts`
- Add `IntersectionObserver` stub (JSDOM lacks it)

### 3. `frontend/src/pages/Students.test.tsx`
- Add test: loading spinner appears when `isFetchingNextPage` (mock returns pending second page)
- Existing tests pass as-is (mock returns `StudentListResponse`; `useInfiniteQuery` stores it in `pages[0]`)

### 4. `e2e/tests/students.spec.ts`
- Add test: after loading a list with fewer students than pageSize, no fetch-next-loading spinner appears.

## Acceptance Criteria Coverage
- [x] All students reachable by scrolling — IntersectionObserver triggers `fetchNextPage`
- [x] API returns paginated response with total count — already done
- [x] Next batch loads automatically when reaching bottom — sentinel + observer
- [x] Loading indicator while fetching — `Loader2` spinner when `isFetchingNextPage`
- [x] No further requests when all loaded — `hasNextPage` is false, observer no-ops
