# Task 795: Students List — Load More, signal logic, and Stitch alignment

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/795

## Scope
All changes are in `frontend/src/pages/Students.tsx`.

## Changes

### F1 (HIGH) — Fix Load More pagination
**Root cause:** The debounce `useEffect` depends on `[localSearch, setSearchParams]`. When `updateParam` calls `setSearchParams` (e.g. on Load More), React Router creates a new `setSearchParams` identity, causing the effect to re-fire and delete `?count` even though search text didn't change.

**Fix:** Track the last-written search value in a ref. Only delete `count` when `localSearch` actually differs from the last committed value.

Add `lastWrittenSearchRef = useRef(qFromUrl)`. Inside the timeout:
```ts
const searchChanged = localSearch !== lastWrittenSearchRef.current
lastWrittenSearchRef.current = localSearch
// only if (searchChanged): next.delete('count')
```

### F2 (MEDIUM) — Column header labels
`TABLE_HEADERS` at line 193:
- `'Level'` -> `'CEFR LEVEL'`
- `'Native Language'` -> `'LANGUAGE'`
- `'Alerts'` -> `'SIGNALS'`

### F3 (MEDIUM) — Remove border violations
- Line 313 skeleton header: remove `border-b border-zinc-100`
- Line 410 sort dropdown: remove `border border-zinc-100` (keep `shadow-lg`)
- Line 569 pagination footer: remove `border-t border-zinc-50`

### F4 (MEDIUM) — RETURNING threshold
Line 100: `>= 30` -> `>= 21`

### F5 (MEDIUM) — Single signal, priority-ordered
Refactor `buildSignals()` to return `Signal | null` (or `Signal[]` with max 1 item) using priority order:
Cancelled 2x > EXAM Xw > Returning > Review pending > Inactive Xd > NEW > none

(HMWK NOT DONE/PARTIAL not yet in data model; skip for now.)

Render site at line 535-553 already handles array; keep return type as `Signal[]` but return at most one item.

### F6 (LOW) — "active" in subtitle
Line 297: `"Managing ${total} language learner"` -> `"Managing ${total} active language learner"`

### F7 (LOW) — ChevronDown on Load More
Add `ChevronDown` to lucide import. Add `<ChevronDown className="h-3.5 w-3.5 ml-1" />` inside Load More button.

### F8 (LOW) — Absolute date for future >6d
`formatRelativeDate` at lines 41-72: for future dates > 6 days, return `"17 May"` format (`date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })`).

## Test plan (manual + e2e)
- Load More expands from 12 to 24; URL shows `?count=24`
- After search and clear, Load More still works
- Headers show CEFR LEVEL, LANGUAGE, SIGNALS
- No 1px borders on footer, sort dropdown, skeleton
- Student with 22-day gap + next session shows RETURNING
- Only one signal badge per student
- Subtitle includes "active"
- Load More button has chevron
- Future date >6d shows "17 May" style
