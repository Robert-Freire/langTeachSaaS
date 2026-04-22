# Task 833: Sprint backlog bug batch

**Issue:** #833  
**Branch:** task/t833-bug-batch-validation-countdown-toast  
**Sprint:** sprint/ui-redesign-student-polish

## Bugs to fix

### 1. AllowedStatuses case-sensitive comparison (backend)

**File:** `backend/LangTeach.Api/Services/StudentService.cs`

`AllowedStatuses` (line 42) is a plain `HashSet<string>` storing `"Active"` and `"Covered"` with the default ordinal case-sensitive comparer. The `Contains` call at line 351 rejects `"active"` or `"ACTIVE"`.

`CanonicalTodoStatuses` (line 47) already uses `OrdinalIgnoreCase`, so todo status validation is already correct.

**Fix:** Change `AllowedStatuses` from `HashSet<string>` to `HashSet<string>(StringComparer.OrdinalIgnoreCase)`.

**Test:** Add a test to `StudentsControllerTests` that sends a difficulty with `"active"` (lowercase) and asserts the request succeeds.

---

### 2. NextSessionHero countdown goes stale (frontend)

**File:** `frontend/src/components/dashboard/NextSessionHero.tsx`

`getUrgencyBadge` computes `Date.now()` at render time only. The badge shows the correct value on load but never updates.

**Fix:**
- Convert `NextSessionHero` from a pure functional component to one with a `useState<number>` tick counter
- `useEffect` sets up a `setInterval` every 60 seconds that increments the tick, forcing re-render
- `getUrgencyBadge` already takes `sessionDate` as a string and calls `Date.now()` inside, so re-rendering is enough to refresh the label

**Test:** Add a test in `NextSessionHero.test.tsx` that uses `vi.useFakeTimers`, advances time by 60s, and verifies the badge label updates.

---

### 3. toggleDifficultyStatus silent failure (frontend)

**Files:** `frontend/src/pages/StudentDetail.tsx`, `frontend/src/components/student/StudentProfileTab.tsx`

The `toggleDifficultyStatus` mutation at line 176 only logs to console on error. No user-visible feedback.

**Pattern in the app:** Other mutations in `StudentProfileTab` use a local `useState` error string with inline `<span className="text-xs text-red-500">` display.

**Fix:**
- Add `mutationError` state to `StudentDetail` for difficulty toggle failures
- Pass it as a new prop `difficultyToggleError?: string | null` to `StudentProfileTab`
- Clear the error on each toggle attempt (optimistic clear)
- Show it inline in the difficulties section near the toggle button

**Test:** Add a test in `StudentDetail.test.tsx` (or `StudentProfileTab.test.tsx`) that mocks the mutation to reject, triggers the toggle, and asserts the error message is visible.

---

## Files to change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Services/StudentService.cs` | OrdinalIgnoreCase on AllowedStatuses |
| `backend/LangTeach.Api.Tests/Controllers/StudentsControllerTests.cs` | Case-insensitive status test |
| `frontend/src/components/dashboard/NextSessionHero.tsx` | setInterval tick |
| `frontend/src/components/dashboard/NextSessionHero.test.tsx` | Fake timer test |
| `frontend/src/pages/StudentDetail.tsx` | Error state + pass to tab |
| `frontend/src/components/student/StudentProfileTab.tsx` | Receive + render error |

## E2E coverage

No new e2e tests needed. These are unit-level bugs. Existing e2e tests exercise the full difficulty update + dashboard flow. The fixes are low-risk, deterministic, and fully covered by unit tests.
