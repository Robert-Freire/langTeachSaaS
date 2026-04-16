# Task 764 — Dashboard: followup labels, relative roster dates, LAST/NEXT column merge, agenda status chips

## Issue
Robert-Freire/langTeachSaaS#764

## Goal
Fix five display gaps in the dashboard found during Stitch side-by-side review. All changes are pure frontend display formatting — no backend changes needed.

## Status Values (verified from backend)
`SessionLogStatus` enum serializes to: `"Confirmed"` (default) or `"Draft"`.
The status chip logic must use session time (past/future) rather than the status field, since "completed" is not a real value.

---

## Changes

### 1. PendingFollowups.tsx — Natural-language age labels

Update `ageBadge()` function:

| days | label (old) | label (new) | color |
|------|-------------|-------------|-------|
| 0 | TODAY | TODAY | green (no change) |
| 1 | 1D OLD | YESTERDAY | amber |
| 2-3 | Xd OLD | X DAYS AGO | amber |
| 4+ | Xd OVERDUE | X DAYS OVERDUE | red |

### 2. StudentRoster.tsx — Three sub-changes

**a) Relative date formatting**

Replace `formatDate()` with a new `formatRelativeDate()`:
- null → "—" (preserving existing null handling)
- today → "Today"
- yesterday → "Yesterday"
- 2-29 days ago → "Xd ago"
- 30+ days ago → absolute "Apr 13" (existing format)
- future dates → absolute "Apr 17" (for next session)

Both Last and Next sub-values in the merged cell use this formatter.

Note: existing test "shows dash for missing native language" (StudentRoster.test.tsx:106) checks `getAllByText('—').length > 0` — this still passes after the merge because the test student has non-null lastSessionDate and nextSessionDate, so the only dash is from L1. No change needed to that test.

**b) Merge NEXT into LAST column as "LAST / NEXT"**

- Remove `<th>Next</th>` column header.
- Rename LAST th text to "LAST / NEXT".
- In the data cell: when `nextSessionDate` exists, render `"{lastDate} → {nextDate}"` (using relative format for both); when no `nextSessionDate`, render just the last session date as before.
- The Next Session sort option stays (still useful for ordering even without a dedicated column).

**c) Rename signal column header**

- `"Signal"` → `"ACTIVITY SIGNAL"`

### 3. TodayAgenda.tsx — Row status chips

Add a status chip (right-aligned) to each session row in the today list.

Status chip logic (evaluated in order):
1. `session.sessionLogId === nextSessionId` → chip: "NEXT SESSION" (indigo: `bg-indigo-100 text-indigo-700`)
   - Also retain the existing `border-l-[3px] border-l-indigo-600 bg-[#ECEAFD]` styling on the row.
2. `new Date(session.sessionDate) < now` → chip: "DONE" (`bg-zinc-100 text-zinc-400`)
3. Otherwise (future sessions today) → chip: "SCHEDULED" (`bg-zinc-100 text-zinc-500`)

Chip placement: append as the last element in the flex row, after the optional `plannedContent` span. Since the row is `flex items-center gap-3`, the chip will be right-most. The `plannedContent` span already has `truncate max-w-[120px]` so there is no layout collision.

Chip style class: `inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold font-inter uppercase tracking-[0.05em] shrink-0`

---

## Tests to update / add

### PendingFollowups.test.tsx
- Update "shows OLD badge for followup 1-3 days old" → now checks for `"DAYS AGO"` (not `"OLD"`)
- Update "shows OVERDUE badge for followup more than 3 days old" → checks for `"DAYS OVERDUE"` (still passes but now includes "DAYS")
- Add: 1-day-old shows "YESTERDAY"

### StudentRoster.test.tsx
- Update existing tests that check for "Next" column header text (now "LAST / NEXT")
- Update tests that look for "Signal" → "ACTIVITY SIGNAL"
- Add: relative date test (last session today shows "Today")
- Add: paired column shows "→" when nextSessionDate exists
- Add: only last date shown when no next session

### TodayAgenda.test.tsx
- Update "highlights the next session" test to also check for "NEXT SESSION" chip text
- Add: past session shows "DONE" chip
- Add: future session today shows "SCHEDULED" chip

---

## Files to change
- `frontend/src/components/dashboard/PendingFollowups.tsx`
- `frontend/src/components/dashboard/StudentRoster.tsx`
- `frontend/src/components/dashboard/TodayAgenda.tsx`
- `frontend/src/components/dashboard/PendingFollowups.test.tsx`
- `frontend/src/components/dashboard/StudentRoster.test.tsx`
- `frontend/src/components/dashboard/TodayAgenda.test.tsx`

No backend changes. No e2e visual spec changes needed (no string assertions in dashboard.visual.spec.ts).

---

## Out of scope
- Hero card student identity subtitle
- Calendar View link
- Signal badge logic
