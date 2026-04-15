# Task 733 — Standardize URL-driven tab state across multi-tab pages

## Goal

Migrate `CourseDetail.tsx` from `useState` tab selection to `useSearchParams`, matching the pattern already used in `StudentDetail.tsx`. This is a pure tech-debt cleanup with no visible behavior change except shareable tab URLs.

## Audit

Pages with tabs:
- `StudentDetail.tsx` — already uses `useSearchParams` (done in #719)
- `CourseDetail.tsx` — uses `useState('curriculum')`, needs migration

No other multi-tab pages found.

## Changes

### `frontend/src/pages/CourseDetail.tsx`

1. Add `useSearchParams` to the `react-router-dom` import (alongside existing `useParams`, `Link`)
2. Replace:
   ```ts
   const [activeTab, setActiveTab] = useState<'curriculum' | 'suggestions'>('curriculum')
   ```
   with:
   ```ts
   const [searchParams, setSearchParams] = useSearchParams()
   const activeTab = (searchParams.get('tab') ?? 'curriculum') as 'curriculum' | 'suggestions'
   ```
3. Replace `onClick={() => setActiveTab('curriculum')}` → `onClick={() => setSearchParams({ tab: 'curriculum' })}`
4. Replace `onClick={() => setActiveTab('suggestions')}` → `onClick={() => setSearchParams({ tab: 'suggestions' })}`
5. Remove `useState` import if no longer used (it is still used for other state; keep it)

### `frontend/src/pages/CourseDetail.test.tsx`

Add a new `describe('tab URL state')` block with:
- `tab click updates URL search param` — click Suggestions tab, assert suggestions panel visible
- `renders correct tab when URL has ?tab=suggestions on load` — render with `initialEntries=['/courses/course-1?tab=suggestions']`, assert suggestions panel visible

`CourseSuggestionsPanel` must be mocked at module level (add to existing mocks) so it doesn't trigger real fetches.

## E2E Coverage

The existing Playwright coverage for CourseDetail pages covers tab navigation. No new e2e test needed for this pure refactor — the unit tests cover the URL state contract.

## Acceptance Criteria Check

- [x] Audit all multi-tab pages (CourseDetail, StudentDetail)
- [x] Migrate CourseDetail to useSearchParams
- [x] Update unit tests for tab URL state
- [x] No visible behavior change
