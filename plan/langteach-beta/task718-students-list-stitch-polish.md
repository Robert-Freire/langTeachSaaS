# Task 718 — Students List: Stitch Design Polish

## Goal
Align the Students List screen with the Stitch design system per issue #718: signal badges, sort dropdown, URL state persistence, layout swaps, subtitle logic, and native language seed data.

## Files Changed

### Frontend
- `frontend/src/pages/Students.tsx` — main page (major changes)
- `frontend/src/pages/Students.test.tsx` — unit tests (update for new interactions)
- `frontend/src/components/dashboard/CefrBadge.tsx` — bump CEFR badge padding

### E2E Tests
- `e2e/tests/students.spec.ts` — remove all `edit-student` testid usages (16 occurrences)
- `e2e/tests/courses.spec.ts` — 1 occurrence
- `e2e/tests/navigation-flow.spec.ts` — 1 occurrence

### Backend
- `backend/LangTeach.Api/Data/DemoSeeder.cs` — add NativeLanguages to seed students

## Changes by AC

### AC: Signal badges — filled pills with per-type colors
- Change `SignalVariant` to use direct `className` strings in `Signal` type
- Replace `SIGNAL_VARIANT_CLASSES` lookup with inline class assignment in `buildSignals`
- All badges: `rounded-full` (not `rounded-md`), `px-2 py-0.5`
- NEW: `bg-green-500 text-white`
- RETURNING: `bg-[#1A1B22] text-white`
- Inactive Xd: `bg-amber-500 text-white`
- Cancelled 2x: `bg-[#1A1B22] text-white` + red dot prefix (`<span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-none" />`)
- Review pending: `bg-[#3525CD] text-white`
- Exam prep: `bg-[#3525CD] text-white`
- Former: `bg-zinc-600 text-white`

### AC: CEFR badge padding
- `CefrBadge.tsx`: change `px-1.5` to `px-2`

### AC: Row hover — warm lavender
- Change `hover:bg-[#E3E1EC]` to `hover:bg-[#ECEAFD]`

### AC: Custom sort dropdown (not native select)
- Replace `<select>` with button + popover pattern
- State: `const [sortOpen, setSortOpen] = useState(false)` (separate from URL params)
- Click-outside: `useRef` + `useEffect` with `mousedown` listener
- Trigger button shows "Sort by: [value label]" with ChevronsUpDown icon, no border
- Options: Next Session, Last Session, Name, CEFR Level
- Set sort via `setSearchParams` (url param `sort`)
- Add `data-testid="sort-button"` to trigger, `data-testid="sort-option-{value}"` to each option

### AC: Load more button — centered
- Change pagination footer to `relative flex items-center`
- Add `className="absolute left-1/2 -translate-x-1/2"` to Load more Button
- Count text stays left-aligned

### AC: Remove pencil edit icon
- Remove entire Actions column from rows (last column in grid)
- Update `COL_CLASSES`: remove `_56px` from end
- Update `TABLE_HEADERS`: remove last `''` entry
- Remove `Pencil` import from lucide-react
- Remove `Tooltip`, `TooltipTrigger`, `TooltipContent` imports (if no longer used)
- Update e2e tests: replace `getByTestId('edit-student').click()` with `locator.click()` + `getByTestId('edit-profile-link').click()`

### AC: Default sort — Last Session
- Default URL param: no `sort` param → `lastSession`
- Code: `const sortBy = (searchParams.get('sort') as SortOption) ?? 'lastSession'`

### AC: Rename SIGNALS to ALERTS
- `TABLE_HEADERS`: change `'Signals'` to `'Alerts'`

### AC: Swap search/filter positions
- Search bar on left, CEFR filter tabs on right
- Reorder JSX in filter bar

### AC: Subtitle — dynamic, no "active"
```
No filter: "Managing N language learner[s] in your atelier"
CEFR active: "Managing N B2 learner[s] in your atelier"
Search active: "Showing N result[s] for 'query'"
```
Priority: search > CEFR > default. Use `allStudents.length` total (not activeCount).

### AC: useSearchParams — state survives back navigation
- Replace 4 `useState` calls with `useSearchParams`
- Param names: `q` (search), `level` (CEFR), `sort` (sort), `count` (visible)
- Use `setSearchParams(fn, { replace: true })` for all updates
- Default values: `q=''`, `level='All'`, `sort='lastSession'`, `count=PAGE_SIZE`

### AC: Seeder — native languages
Add realistic `NativeLanguages` to these students:
- Demo seed: Marco Rossi → Italian, Yuki Tanaka → Japanese, Fatima Al-Hassan → Arabic, Carlos Mendez → Spanish
- Visual seed: Marco Visual → Italian
- Scenario seed: Marco Seed → Italian, Clara Seed → German

## Unit Test Updates (Students.test.tsx)

### wrapper function
Add `initialSearch` param:
```tsx
function wrapper(ui: React.ReactElement, initialSearch = '') {
  const client = ...
  return render(
    <QueryClientProvider ...>
      <MemoryRouter initialEntries={[`/${initialSearch}`]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}
```

### Sort tests
Replace `screen.getByRole('combobox', { name: /sort/i })` with URL approach:
- `sort by Next Session` → `wrapper(<Students />, '?sort=nextSession')`
- `sort by Last Session` → `wrapper(<Students />, '?sort=lastSession')`
- `sort by Name` → `wrapper(<Students />, '?sort=name')`
- `sort by CEFR Level` → `wrapper(<Students />, '?sort=cefrLevel')`

### New tests
- Subtitle shows total count without "active"
- Subtitle updates with CEFR filter
- Subtitle updates with search
- ALERTS column header rendered (not SIGNALS)

## E2E Test Pattern

Old:
```js
await someCard.getByTestId('edit-student').click()
await expect(page.locator('h1')).toHaveText('Edit Student', ...)
```

New:
```js
await someCard.click()
await page.getByTestId('edit-profile-link').click()
await expect(page.locator('h1')).toHaveText('Edit Student', ...)
```

For delete flows where `edit-student` was used to navigate to `/students/:id/edit`:
- Use `someCard.click()` to navigate to detail, then `page.getByTestId('edit-profile-link').click()`.

## Acceptance Criteria Checklist
- [x] Signal badges: filled pills with per-type colors, rounded-full
- [x] CEFR badge: px-2 horizontal padding
- [x] Row hover: warm lavender (#ECEAFD)
- [x] Sort: custom dropdown, no border, "Sort by: Label ↕"
- [x] Load more: centered
- [x] Pencil icon removed; e2e tests updated
- [x] Default sort: Last Session
- [x] Column header: ALERTS not SIGNALS
- [x] Search left, CEFR filter right
- [x] Subtitle: no "active", dynamic
- [x] useSearchParams replaces 4 useState
- [x] Native languages in seeder
