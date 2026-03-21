# Task 103: Sign-up & Onboarding Wizard

## Issue
GitHub #103 (P1:must, Phase 2A: Teacher Workflow)

## Problem
New users land on a blank dashboard after registration with no guided path. Need a step-by-step wizard that walks them through setup, first student, and first lesson.

## Design Decisions

### Onboarding State Tracking
Add `HasCompletedOnboarding` boolean to the `Teacher` entity. Using an explicit flag rather than inferring from data presence (settings/students) because:
- Explicit is more reliable than implicit (teacher could delete their students later)
- Simple to query and test
- Allows "skip onboarding" in the future if needed

### Mid-wizard Resume
Derive current step from existing data when `hasCompletedOnboarding` is false:
- Backend `Settings` is null (no TeacherSettings row)? Show step 1
- No students? Show step 2
- No lessons? Show step 3
- Otherwise complete

Check `Settings == null` on the backend side (not whether teachingLanguages array is empty, since an empty array is a valid saved state). The profile API will include a `hasStudents` and `hasLessons` boolean to support this without extra API calls.

This works because each step creates persistent data. If user navigates away after step 1 (profile saved) but before step 2, they resume at step 2.

### Lesson Generation in Step 3
Step 3 creates the lesson with basic parameters (title, topic, language/level auto-filled from the student, durationMinutes defaulted to 60), then redirects to the lesson editor. The wizard marks onboarding complete at this point. This avoids duplicating the streaming generation UI inside the wizard and lets the user learn the lesson editor naturally.

### Routing Strategy
Add `/onboarding` route outside the `AppShell` layout (wizard has its own minimal chrome). The profile query hook will include `hasCompletedOnboarding`, and a redirect guard in `App.tsx` sends new users to `/onboarding` when the flag is false. The guard must handle the `isLoading` state by showing a loading spinner to avoid a flash redirect to `/onboarding` while the profile query is in flight.

## Implementation Plan

### 1. Backend: Add HasCompletedOnboarding to Teacher

**Files:**
- `backend/LangTeach.Api/Data/Models/Teacher.cs` - add `HasCompletedOnboarding` bool (default false)
- New migration file - add column with `migrationBuilder.Sql("UPDATE Teachers SET HasCompletedOnboarding = 1")` in `Up()` so existing teachers skip onboarding
- `backend/LangTeach.Api/DTOs/ProfileDto.cs` - add `HasCompletedOnboarding` as 6th positional parameter, plus `HasStudents` and `HasLessons` booleans for resume inference
- `backend/LangTeach.Api/Services/ProfileService.cs` - update `MapToDto` to pass `teacher.HasCompletedOnboarding` and query student/lesson existence; add `CompleteOnboardingAsync` method
- `backend/LangTeach.Api/Services/IProfileService.cs` - add `CompleteOnboardingAsync` signature
- `backend/LangTeach.Api/Controllers/ProfileController.cs` - add `POST /api/profile/complete-onboarding` endpoint

**Logic:**
- `CompleteOnboardingAsync(auth0UserId)`: sets `HasCompletedOnboarding = true`, saves
- The existing `GET /api/profile` returns the flag via ProfileDto
- Migration adds column with `DEFAULT 0`, then runs `UPDATE Teachers SET HasCompletedOnboarding = 1` to mark all existing teachers as onboarded
- EF config: `HasDefaultValue(false)` on `HasCompletedOnboarding` in `OnModelCreating` (or rely on migration default)

### 2. Frontend: Profile type + API updates

**Files:**
- `frontend/src/types/profile.ts` - add `hasCompletedOnboarding: boolean`, `hasStudents: boolean`, `hasLessons: boolean`
- `frontend/src/api/profileApi.ts` - add `completeOnboarding()` function
- `frontend/src/hooks/useProfile.ts` - add `useCompleteOnboarding` mutation hook

### 3. Frontend: Onboarding Wizard page

**Files:**
- `frontend/src/pages/Onboarding.tsx` - main wizard container (step state, navigation, progress bar)
- `frontend/src/pages/onboarding/OnboardingStep1.tsx` - profile setup step
- `frontend/src/pages/onboarding/OnboardingStep2.tsx` - first student step
- `frontend/src/pages/onboarding/OnboardingStep3.tsx` - first lesson step

**Component structure:**
```
Onboarding (container)
  - Step indicator (1/2/3 progress bar)
  - OnboardingStep1: ProfileSetup (name, teaching languages, CEFR levels, preferred style)
  - OnboardingStep2: FirstStudent (name, learning language, CEFR level, native language)
  - OnboardingStep3: FirstLesson (title, topic, language/level auto-filled, duration defaulted to 60)
  - Each step has Back/Next navigation
```

**Step 1 (Profile Setup):**
- Reuse the same fields from Settings page (display name, teaching languages, CEFR levels, preferred style)
- Calls `PUT /api/profile` on "Next"
- Pre-fills display name from Auth0 user info

**Step 2 (First Student):**
- Simplified student form: name, learning language, CEFR level, native language
- Calls `POST /api/students` on "Next"
- Stores created student ID for step 3

**Step 3 (First Lesson):**
- Title input field and topic input field (both required by `CreateLessonRequest`)
- Language and level auto-filled from student (read-only display)
- Duration defaults to 60 minutes (hidden or shown as simple selector)
- Calls `POST /api/lessons` to create the lesson
- Calls `POST /api/profile/complete-onboarding`
- Redirects to `/lessons/{id}` (the lesson editor)

### 4. Frontend: Routing + redirect guard

**Files:**
- `frontend/src/App.tsx` - add `/onboarding` route, add redirect logic
- `frontend/src/components/OnboardingGuard.tsx` - guard component

**Changes:**
- Add `<Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />`
- This route is OUTSIDE the `AppShell` layout (no sidebar during onboarding)
- `OnboardingGuard` wraps the AppShell routes, calls `useProfile()`, and:
  - While `isLoading`: renders a full-page loading spinner (prevents flash redirect)
  - If `!hasCompletedOnboarding`: redirects to `/onboarding`
  - Otherwise: renders children
- The `/onboarding` route itself should redirect to `/` if onboarding is already complete

### 5. Frontend: Unit tests

**Files:**
- `frontend/src/pages/Onboarding.test.tsx`
- `frontend/src/components/OnboardingGuard.test.tsx`

**Test cases:**
- Renders step 1 by default for new user
- Advances to step 2 after profile save
- Advances to step 3 after student creation
- Redirects to dashboard if onboarding already completed
- Step indicators show correct active state
- Can navigate back between steps
- Resume: starts at step 2 if profile has settings but no students
- Resume: starts at step 3 if student exists but no lessons
- OnboardingGuard: shows loading state while profile loads
- OnboardingGuard: redirects to /onboarding when hasCompletedOnboarding is false
- OnboardingGuard: renders children when hasCompletedOnboarding is true

### 6. E2E test

**Files:**
- `e2e/tests/onboarding.spec.ts`

**Happy path:**
1. Fresh e2e user (reset via `resetE2ETestTeacher` in beforeAll) lands on `/onboarding`
2. Fills step 1 (profile), advances
3. Fills step 2 (student), advances
4. Fills step 3 (lesson title + topic), completes
5. Lands on lesson editor page
6. Refreshing goes to dashboard (not wizard)

### 7. Backend integration tests

**Files:**
- `backend/LangTeach.Api.Tests/Controllers/ProfileControllerTests.cs` (new file, using `AuthenticatedWebAppFactory` pattern like other controller tests)

**Test cases:**
- `GET /api/profile` returns `hasCompletedOnboarding: false` for new teacher
- `POST /api/profile/complete-onboarding` sets flag to true
- `GET /api/profile` returns `hasCompletedOnboarding: true` after completion
- `POST /api/profile/complete-onboarding` is idempotent (calling twice doesn't error)

### 8. E2E helper updates (prevent existing test breakage)

**Files:**
- `e2e/helpers/db-helper.ts` - update `approveE2ETestTeacher` to also set `HasCompletedOnboarding = 1`
- `e2e/helpers/mock-teacher-helper.ts` - no changes needed (it calls `approveE2ETestTeacher` which will now also set the flag)

**Rationale:** All 21 existing e2e test files call `setupMockTeacher` which calls `approveE2ETestTeacher`. Without this update, every existing e2e test would be redirected to `/onboarding` instead of the dashboard. The onboarding e2e test itself will call `resetE2ETestTeacher` (already exists in db-helper) to delete and recreate the teacher fresh, so it starts with `HasCompletedOnboarding = false`.

## Out of Scope
- "Skip onboarding" button (not in AC, can add later)
- Animations/transitions between steps (polish, not functional)
- Email verification step (Auth0 handles this)
