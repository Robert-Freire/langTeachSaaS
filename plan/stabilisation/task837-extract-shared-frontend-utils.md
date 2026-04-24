# Task 837: Extract Shared Frontend Utilities

**Issue:** #837 - chore: extract shared frontend utilities (getInitials, formatRelativeDate, CEFR_ORDER)
**Branch:** worktree-task-t837-extract-shared-frontend-utils -> sprint/stabilisation

## Goal

Move three duplicated patterns into shared utils. No functional changes (minor string format change acceptable for formatRelativeDate past-dates).

## Files to Create

- `frontend/src/utils/nameUtils.ts` — exports `getInitials(name: string): string`
- `frontend/src/utils/cefrUtils.ts` — exports `CEFR_ORDER: Record<string, number>`
- `frontend/src/utils/nameUtils.test.ts` — unit tests for `getInitials`

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/pages/Students.tsx` | Remove local `getInitials`; import from `nameUtils`. Refactor `formatRelativeDate` to call `relativeTime()` for past-date base. |
| `frontend/src/pages/StudentDetail.tsx` | Remove local `getInitials`; import from `nameUtils`. |
| `frontend/src/pages/LogSession.tsx` | Remove local `getInitials`; import from `nameUtils`. |
| `frontend/src/components/student/ProgressDashboard.tsx` | Remove local `CEFR_ORDER`; import from `cefrUtils`. |
| `frontend/src/components/student/StudentOverviewTab.tsx` | Remove local `CEFR_ORDER` array; import from `cefrUtils`. Update `cefrBarWidth` to use Record lookup. |

## Implementation Notes

### getInitials canonical form (use Students.tsx version — most defensive)
```ts
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  return words.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}
```

### cefrUtils.ts — Record<string, number>
```ts
export const CEFR_ORDER: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }
```

`StudentOverviewTab.cefrBarWidth` currently uses `indexOf` on an array (idx+1)/length. With Record, rewrite as:
```ts
const num = CEFR_ORDER[level.toUpperCase()] ?? 0
return Math.round((num / 6) * 100)
```
Same numeric output (A1=17, A2=33, ..., C2=100).

### formatRelativeDate refactor
Keep local helper in `Students.tsx`, but call `relativeTime()` (imported from `@/utils/formatDate`) for past dates:
- diffDays < 0 (future): handle locally (no change)
- diffDays >= 0: delegate to `relativeTime(dateStr)`, then capitalize + add time for "today"

Minor string change: past dates beyond yesterday change from "3d ago" to "3 days ago" (relativeTime output). Acceptable — cosmetic only.

```ts
import { relativeTime } from '@/utils/formatDate'

function formatRelativeDate(dateStr: string | null | undefined, showTime = false): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    // Future dates — relativeTime doesn't handle these
    const futureDays = Math.abs(diffDays)
    if (showTime) {
      const t = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      if (futureDays === 1) return `Tomorrow ${t}`
      if (futureDays <= 6) return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${t}`
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }
    if (futureDays === 1) return 'Tomorrow'
    if (futureDays <= 6) return `in ${futureDays}d`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  // Past/today — delegate base to relativeTime()
  const base = relativeTime(dateStr)
  if (base === 'today') {
    if (showTime) {
      const t = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      return `Today ${t}`
    }
    return 'Today'
  }
  if (base === 'yesterday') return 'Yesterday'
  return base.charAt(0).toUpperCase() + base.slice(1)
}
```

## Test Plan (nameUtils.test.ts)

- Two-word name → two uppercase initials
- Single-word name → one initial
- Multiple spaces between words handled correctly
- Empty string handled gracefully
