# Task 903 — Sessions list: all sessions show "CONFIRMED" badge

## Root Cause

Three compounding issues:

1. `DashboardService.GetSessionsListAsync` (line 185-190) applies `!sl.IsCancelled` to the
   `recentRaw` query, so cancelled sessions are silently dropped before they reach the frontend.
   Upcoming query correctly excludes cancelled sessions (they wouldn't appear there anyway).

2. `DemoSeeder.cs` has no sessions with `Status = SessionLogStatus.Draft` and no cancelled
   sessions within the 7-day recent window (Nataliya's sessions are -20 and -10 days; Clara's
   are -18 and -8 days -- all outside the cutoff).

3. The frontend has no mapping from `("Confirmed", date)` → "Scheduled" / "Completed".
   All visible sessions return `"Confirmed"` from the backend, which CSS-uppercases to "CONFIRMED".

## Changes

### 1. Backend — `DashboardService.cs`

- Remove `&& !sl.IsCancelled` from the `recentRaw` query so cancelled sessions appear.
- `MapToSessionListItem` (line 205-213) already handles `IsCancelled ? "Cancelled" : sl.Status.ToString()` correctly. No change needed there.

### 2. Backend — `DemoSeeder.cs`

- Move one cancelled session per student into the recent window:
  - Nataliya second session: -10d → -4d
  - Clara second session: -8d → -3d
- Add one upcoming Draft session for Hugo Seed (`Status = SessionLogStatus.Draft`).

### 3. Frontend — extract `getDisplayStatus` utility

New file `frontend/src/utils/sessionStatusUtils.ts`:

```typescript
export function getDisplayStatus(status: string, sessionDate: string): string {
  if (status === 'Cancelled') return 'Cancelled'
  if (status === 'Draft') return 'Draft'
  const now = new Date()
  const date = new Date(sessionDate)
  return date < now ? 'Completed' : 'Scheduled'
}
```

### 4. Frontend — `Sessions.tsx`

- Import `getDisplayStatus` from the utility.
- Update `statusChipClass` to add 'Scheduled' (indigo-50/indigo-600) and 'Completed' (zinc-100/zinc-500 — same as current fallback).
- In `SessionRow` chip: use `getDisplayStatus(session.status, session.sessionDate)` for both the chip text and class lookup.

```typescript
function statusChipClass(status: string): string {
  if (status === 'Cancelled') return 'bg-red-50 text-red-600'
  if (status === 'Draft') return 'bg-amber-50 text-amber-700'
  if (status === 'Scheduled') return 'bg-indigo-50 text-indigo-600'
  return 'bg-zinc-100 text-zinc-500' // Completed
}
```

### 5. Frontend — unit test `sessionStatusUtils.test.ts`

Test `getDisplayStatus` for:
- Cancelled
- Draft
- Confirmed + past date → "Completed"
- Confirmed + future date → "Scheduled"

### 6. E2E visual spec — `e2e/tests/visual/sessions-list.visual.spec.ts`

File already exists. Add a new `@visual` test to the existing file: demo teacher auth, navigate to `/sessions`, screenshot to verify mixed status chips (Completed, Scheduled, Cancelled, Draft visible simultaneously). Do not overwrite existing tests.

## Files changed

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Services/DashboardService.cs` | Remove `!sl.IsCancelled` from recentRaw query |
| `backend/LangTeach.Api/Data/DemoSeeder.cs` | Move cancelled sessions into recent window; add Draft session |
| `frontend/src/utils/sessionStatusUtils.ts` | New utility: `getDisplayStatus` |
| `frontend/src/utils/sessionStatusUtils.test.ts` | Unit tests for all 4 states |
| `frontend/src/pages/Sessions.tsx` | Use `getDisplayStatus`, update `statusChipClass` |
| `e2e/tests/visual/sessions-list.visual.spec.ts` | Add mixed-status test to existing file |

## Out of scope

- Editing session status from the list (issue #901)
- Filtering by status
- Revising color tokens
- Adding "Completed" or "Scheduled" to `SessionLogStatus` enum (display concern only)
