# Task 213: Make Onboarding Steps 2-3 Skippable

**Issue:** #213
**Branch:** worktree-task-t213-skippable-onboarding
**Sprint:** Curriculum & Personalization

## Goal

Allow teachers to skip steps 2 (student creation) and 3 (lesson creation) during onboarding. Step 1 (profile) stays required. `complete-onboarding` moves to after Step 1 so the guard clears as soon as the profile is done.

## Current Architecture

- `frontend/src/pages/Onboarding.tsx` — wizard container, `deriveInitialStep()`, step state, resume logic
- `frontend/src/pages/onboarding/OnboardingStep1.tsx` — profile setup; on complete, navigates to step 2
- `frontend/src/pages/onboarding/OnboardingStep2.tsx` — student creation; on complete, navigates to step 3
- `frontend/src/pages/onboarding/OnboardingStep3.tsx` — lesson creation; on complete, calls `completeOnboarding()` then navigates to lesson editor
- `frontend/src/components/OnboardingGuard.tsx` — redirects to `/onboarding` if `!profile.hasCompletedOnboarding`
- Backend `POST /api/profile/complete-onboarding` — sets `HasCompletedOnboarding = true`

## Changes

### 1. `Onboarding.tsx`

- **Remove the early redirect** at line 104-106: `if (profile?.hasCompletedOnboarding) { return <Navigate to="/" replace /> }`. Once `completeOnboarding()` is called after Step 1, the profile re-fetches with `hasCompletedOnboarding = true`, and this redirect would immediately send the user to `/` before Steps 2 and 3 can render. The `OnboardingGuard` already protects all other routes; this self-redirect in the wizard is no longer needed.
- **Add import**: `useCompleteOnboarding` from `../hooks/useProfile` (currently only imported in `OnboardingStep3.tsx`).
- After Step 1 completion: call `completeOnboarding()` as **fire-and-forget** (do not await before `setStep(2)`), then proceed to Step 2. No race condition risk since the early redirect is removed.
- Add `onSkip` handler for Step 2: navigate to `/` (dashboard).
- Add `onSkip` handler for Step 3: navigate to `/` (dashboard).
- Step 3 auto-skips if Step 2 was skipped: handled naturally since skip on Step 2 navigates to dashboard, bypassing Step 3 entirely. No extra state needed.
- `deriveInitialStep()` stays unchanged (uses `hasSettings`/`hasStudents`/`hasLessons` flags).

### 2. `OnboardingStep1.tsx`

No change to UI. The `completeOnboarding` call moves to `Onboarding.tsx` (called when step 1 callback fires), so `OnboardingStep3.tsx` no longer calls it.

### 3. `OnboardingStep2.tsx`

- Add "Skip, I'll do this later" text link/button below the primary CTA.
- Calls `onSkip` prop (new optional prop with no-op default).

### 4. `OnboardingStep3.tsx`

- Add "Skip, I'll do this later" text link/button below the primary CTA.
- Calls `onSkip` prop (new optional prop with no-op default).
- Remove `completeOnboarding()` call from here (moves to Onboarding.tsx after Step 1).

### 5. Empty states (verify, no change expected)

- `Students.tsx` already has "No students yet" empty state — verify text is guiding.
- `Lessons.tsx` already has "No lessons yet" empty state — verify text is guiding.
- Dashboard (`Dashboard.tsx` or similar) — check if there's an empty state; if not, this is out of scope for the AC (the AC says "dashboard and student list", but only if the existing states need updating).

## Acceptance Criteria Mapping

| AC | Change |
|----|--------|
| Step 1 remains required | No skip added to Step 1 |
| Step 2 has visible skip | Skip button in OnboardingStep2 |
| Step 3 has visible skip | Skip button in OnboardingStep3 |
| Step 3 auto-skips if Step 2 skipped | Skip on Step 2 → dashboard, bypasses Step 3 |
| `complete-onboarding` called after Step 1 | Moved from Step3 completion to Step1 callback in Onboarding.tsx |
| Skipping lands on dashboard | `onSkip` → navigate('/') |
| Empty states guide next steps | Verify existing states are sufficient |
| Existing full flow unchanged | All existing `onComplete` paths unchanged |

## Tests

### Unit tests — `Onboarding.test.tsx` (update existing file)

New tests to add:
- Step 1 complete → `completeOnboarding` mutateAsync called (fire-and-forget, before setStep)
- Step 2 skip button → navigates to `/` (dashboard)
- Step 3 skip button → navigates to `/` (dashboard)

Existing test to update:
- `'redirects to dashboard if onboarding already completed'` — this test verifies the early redirect that is being removed. Replace it with a test that verifies a user with `hasCompletedOnboarding = true` and `hasSettings = true` but `hasStudents = false` sees Step 2 (i.e., the wizard shows optional steps rather than redirecting).

### Unit tests — step components (new test files)

- `OnboardingStep2.test.tsx`: skip button is visible, clicking it calls `onSkip`
- `OnboardingStep3.test.tsx`: skip button is visible, clicking it calls `onSkip`; confirm `useCompleteOnboarding` is NOT called directly from this component

### e2e tests — `e2e/tests/onboarding.spec.ts` (update existing file)

Add one new test inside the existing `describe.serial` block:
- `'new user skips steps 2 and 3'`: complete Step 1 profile, click "Skip" on Step 2, verify redirect to `/` (dashboard). The existing full-flow test already covers step 1 → 2 → 3 → lesson editor.

## Out of Scope

- Backend changes (no backend change needed)
- Empty state copy rewrites (existing copy is sufficient per AC "already have empty states")
- Dashboard empty state creation (not blocked — steps 2/3 skip goes to dashboard which has existing lessons list)
