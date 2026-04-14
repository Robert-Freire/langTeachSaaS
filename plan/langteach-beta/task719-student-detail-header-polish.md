# Task 719 — Student Detail Shared Header Polish

**Issue:** #719  
**Branch:** `worktree-task-t719-student-detail-header-polish`  
**Sprint:** `sprint/ui-redesign-student-polish`

---

## Goal

Polish the shared header in `StudentDetail.tsx` (shared across all 4 tabs) per Vera/Isaac review feedback and Stitch design references. Six acceptance criteria.

---

## Affected Files

| File | Change |
|------|--------|
| `frontend/src/pages/StudentDetail.tsx` | All 6 ACs |
| `frontend/src/components/student/StudentOverviewTab.tsx` | Remove `PrimaryObjectiveCard` from render (AC2) |
| `frontend/src/pages/StudentDetail.test.tsx` | Update/add unit tests for all 6 ACs |
| `e2e/tests/students.spec.ts` | Update e2e for primary-objective-card location change + tab URL AC |

---

## AC1 — Identity subtitle

**Spec:** "Ukrainian speaker · Software Engineer, Kyiv"

**Current state:** A plain `<p data-testid="student-header-profession">` shows `student.profession` only.

**Change:** Replace the profession paragraph with a subtitle element that combines:
- `{nativeLanguages[0]} speaker` (if nativeLanguages.length > 0)
- `· {profession}` (appended with middot-space if profession set)
- `, {cityOfResidence ?? cityOfOrigin}` (appended after profession if location set)

Rules:
- If all three are absent: render nothing (no element)
- If only L1: "English speaker"
- If L1 + profession: "English speaker · Designer"
- If L1 + profession + city: "English speaker · Designer, Barcelona"
- If no L1 but profession + city: "Designer, Barcelona"
- testid: `student-header-subtitle` (replaces `student-header-profession`)

**Test changes:**
- Remove test "shows profession below name in header when set" (testid `student-header-profession` disappears)
- Remove test "does not render profession element when profession is null"
- Add: "shows identity subtitle with L1, profession, and city"
- Add: "omits L1 segment when nativeLanguages is empty"
- Add: "omits profession segment when profession is null"
- Add: "hides subtitle entirely when all three segments are absent"
- Update location test: `student-header-location` stays in metadata row (not removed)

---

## AC2 — Primary Objective in header

**Spec:** Move into header card; hide entirely when empty.

**Current state:** `PrimaryObjectiveCard` is the first element in `StudentOverviewTab` render, taking ~60px even when empty.

**Change:**

### `StudentOverviewTab.tsx`
- Remove `<PrimaryObjectiveCard student={student} />` from the render.
- `PrimaryObjectiveCard` component can stay (used in header) or be extracted to a shared location. Since the header is in `StudentDetail.tsx`, duplicate the compact version inline there.

### `StudentDetail.tsx` — header card
Add below the badge rows (before the actions column closes):
```tsx
{/* Compact Primary Objective — in header */}
{hasObjective && (
  <div data-testid="primary-objective-card" className="mt-2 flex items-start gap-2 ...">
    <span data-testid="objective-text">{primaryObj.text}</span>
    {/* deadline + days remaining */}
    {primaryObj.targetDate && (
      <span data-testid="days-remaining">{formatDaysRemaining(daysRemaining)}</span>
    )}
  </div>
)}
```

Styling: uses `tertiary` (#7E3000) warm tone for the objective text, compact inline layout, no separate card shell.

**Logic (inline in StudentDetail.tsx):**
```typescript
const sortedObjectives = [...student.shortTermObjectives].sort(/* urgency sort */)
const primaryObj = sortedObjectives[0] ?? null
const objUrgency = primaryObj ? getObjectiveUrgency(primaryObj.targetDate) : 'normal'
const objDaysRemaining = primaryObj ? getDaysRemaining(primaryObj.targetDate) : null
```

**Test changes:**
- `primary-objective-card`, `objective-text`, `days-remaining` testids now live in header (always visible, not just on overview tab)
- Tests "renders primary objective card" and "shows days remaining" still pass as-is (testids exist in DOM)
- Test "shows empty state when no objectives" — currently checks for "No objectives set" text. After change, when empty the element is hidden. Update to: check `primary-objective-card` is NOT in document when no objectives.

**E2E changes:**
- `students.spec.ts` line 452: `expect(page.getByTestId('primary-objective-card')).toBeVisible()` — this test creates a student with no objectives, so after this change the card is hidden. Change to: verify `student-overview-tab` is visible without checking `primary-objective-card`.
- Line 666-667: test creates an objective, then checks overview tab for `primary-objective-card`. After change the card is in header (visible on all tabs). Test should still pass, but verify the assertion is valid from header context.

---

## AC3 — Session frequency indicator

**Spec:** "3 sessions in 7 weeks" or "avg. every 16 days"

**Implementation:** Add `calcSessionFrequency(sessions: SessionLog[]): string | null` utility in `StudentDetail.tsx`:
1. Filter: non-cancelled, confirmed, past, with sessionDate
2. If count == 0: return null
3. If count == 1: return "1 session"
4. Compute date span: days from first to last session
5. If span < 14 days: return `${count} sessions`
6. Compute avg interval: `Math.round(span / (count - 1))`
7. Compute weeks: `Math.round(span / 7)`
8. Return: `${count} sessions in ${weeks} weeks · avg. every ${avgDays} days`
   - If weeks == 1: `${count} sessions in 1 week · avg. every ${avgDays} days`

**Placement:** Near the existing status/type/level badges row (below status badge, before or after next-session pill).

**Testid:** `session-frequency-indicator`

**Unit tests to add:**
- "shows session frequency indicator when sessions exist" (mock sessions array)
- "hides session frequency indicator when no sessions"

---

## AC4 — Tab row polish

**Current:** `px-4 py-2` with `hover:text-zinc-700 hover:bg-white/50`

**Change:**
- Increase padding to `px-5 py-2.5`
- Inactive hover: `hover:bg-[#F4F2FD]` (surface-container-low, per design spec)
- Keep active tab: white bg with box-shadow

No testid changes needed.

---

## AC5 — Tab state in URL

**Current:** `const [searchParams] = useSearchParams()` + `const [activeTab, setActiveTab] = useState(defaultTab)`

Tab clicks call `setActiveTab(tab.key)` but don't update searchParams.

**Fix:** Remove `useState` for `activeTab`. Derive active tab directly from `searchParams`. Update tab click to call `setSearchParams({ tab: key })`.

```typescript
const [searchParams, setSearchParams] = useSearchParams()
const activeTab = searchParams.get('tab') ?? 'overview'
// tab click: setSearchParams({ tab: tab.key })
```

**Test changes:**
- Add: "tab click updates URL search param"
- Add: "renders profile tab when URL has ?tab=profile on load"

**E2E changes:** None needed (existing tests already test tab navigation by clicking and checking content).

---

## AC6 — Edit Student button upgrade

**Current:** `<Link>` with `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-[#1A1B22] hover:bg-[#F4F2FD]` — effectively a ghost button.

**Change:** Give it a persistent tonal background (secondary button per design spec):
- `bg-[#E8E7F1] text-[#3525CD] hover:bg-[#DDD9F5]` (tonal surface, primary text)
- Keep `rounded-xl px-3 py-2 text-sm font-medium`
- Keep `data-testid="edit-profile-link"` to avoid test churn

The element stays as a `<Link>` (since it navigates), just with the visual style upgraded. No functional test changes needed.

---

## Implementation Order

1. AC5 (tab URL) — pure logic refactor, unblocks nothing
2. AC1 (identity subtitle) — rename testid, update tests
3. AC2 (objective in header) — move component, update overview tab
4. AC3 (session frequency) — add utility + UI
5. AC4 (tab padding) — trivial style tweak
6. AC6 (edit button style) — trivial style tweak
7. Update `e2e/tests/students.spec.ts` for AC2 impact
8. Run unit tests + e2e

---

## E2E Coverage

The happy-path e2e test `'student detail shows 4 tabs and overview content by default'` will be updated to:
- NOT check `primary-objective-card` when student has no objectives
- Instead verify `student-overview-tab` is visible

The test `'motivation fields: reason for studying and objectives round-trip'` (line 638) will be checked: it creates an objective, navigates to Overview tab, and checks `primary-objective-card`. After our change the card is in the header, so it's visible regardless of tab. The assertion should still pass.

---

## Notes

- `getObjectiveUrgency` / `getDaysRemaining` / `formatDaysRemaining` are in `@/lib/objectiveUrgency` — import from there.
- The `sessions` query is already loaded in `StudentDetail` for `nextSession` calculation. Reuse for session frequency.
- No backend changes needed. All data already available.
- `nativeLanguages` in `MOCK_STUDENT` is `['English']` — tests will see "English speaker · Designer, Barcelona".
