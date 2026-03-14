# T5 — Teacher Profile API + UI

**Phase**: 1 — Foundation
**Priority**: Must
**Effort**: 1 day
**Depends on**: T4 (DONE — DB schema, EF migrations, Teacher + TeacherSettings entities, AppDbContext DbSets, teacher upsert on login all complete)
**Branch**: `task/t5-teacher-profile`

---

## Goal

A logged-in teacher can view and update their profile (display name, languages taught, CEFR levels, preferred content style). Data persists across sessions. API is protected and returns only the current teacher's data.

---

## Pre-conditions

All satisfied (T4 done):
- EF migrations created `Teachers` and `TeacherSettings` tables
- `AppDbContext` has `DbSet<Teacher>` and `DbSet<TeacherSettings>`
- `AuthController.Me()` upserts a `Teacher` row on first login
- `e2e/tests/auth-helper.ts` exists

---

## Backend

### 1. DTOs

Create `backend/LangTeach.Api/DTOs/ProfileDto.cs`:

```csharp
public record ProfileDto(
    Guid Id,
    string DisplayName,
    List<string> TeachingLanguages,   // from TeacherSettings.TeachingLanguages JSON
    List<string> CefrLevels,          // from TeacherSettings.CefrLevels JSON
    string PreferredStyle             // from TeacherSettings.PreferredStyle
);
```

Create `backend/LangTeach.Api/DTOs/UpdateProfileRequest.cs`:

```csharp
public record UpdateProfileRequest(
    [Required][MaxLength(100)] string DisplayName,
    [Required] List<string> TeachingLanguages,
    [Required] List<string> CefrLevels,
    [Required][MaxLength(50)] string PreferredStyle
);
```

Both DTOs live in `backend/LangTeach.Api/DTOs/`. No entity classes are ever returned directly.

### 2. Service

Create `backend/LangTeach.Api/Services/IProfileService.cs`:

```csharp
public interface IProfileService
{
    Task<ProfileDto?> GetProfileAsync(string auth0UserId);
    Task<ProfileDto> UpdateProfileAsync(string auth0UserId, UpdateProfileRequest request);
}
```

Create `backend/LangTeach.Api/Services/ProfileService.cs`:

- `GetProfileAsync`: query `Teachers` joined to `TeacherSettings` by `TeacherId` where `Auth0UserId == auth0UserId`. If `TeacherSettings` row does not exist yet, return defaults (empty lists, empty style). Never throw for missing settings.
- `UpdateProfileAsync`: update `Teacher.DisplayName` and upsert `TeacherSettings` (insert if missing, update if present). Save changes. Return the updated `ProfileDto`.
- Register as `services.AddScoped<IProfileService, ProfileService>()` in `Program.cs`.

### 3. Controller

Create `backend/LangTeach.Api/Controllers/ProfileController.cs`:

```
[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
```

Helper: `private string GetAuth0UserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!`

**GET /api/profile**

```
[HttpGet]
public async Task<IActionResult> Get()
```

- Call `GetProfileAsync(auth0UserId)`
- If null: return 404 (teacher not found — should not happen after T4 upsert, log at Warning)
- Return 200 with `ProfileDto`
- Log: `_logger.LogInformation("GET /api/profile teacherId={TeacherId}", profile.Id)`

**PUT /api/profile**

```
[HttpPut]
public async Task<IActionResult> Update([FromBody] UpdateProfileRequest request)
```

- If `!ModelState.IsValid`: log at Warning with field errors, return 400
- Call `UpdateProfileAsync(auth0UserId, request)`
- Return 200 with updated `ProfileDto`
- Log: `_logger.LogInformation("PUT /api/profile teacherId={TeacherId} displayName={DisplayName}", updated.Id, updated.DisplayName)`

### 4. Validation rules

`TeachingLanguages` values must be from the allowed set (English, Spanish, French, German, Italian, Portuguese, Mandarin, Japanese, Arabic, Other). Add a custom `[ValidLanguages]` validation attribute or validate in the service and return a 400 with a clear message. Keep it simple — service-layer validation is fine.

`PreferredStyle` must be one of: `Formal`, `Conversational`, `Exam-prep`.

`CefrLevels` values must be subset of: A1, A2, B1, B2, C1, C2.

### 5. Row-level security

All service queries filter by `Auth0UserId` derived from the JWT. There is no admin override. A teacher cannot read or write another teacher's profile — the `auth0UserId` is always taken from `User.FindFirstValue(ClaimTypes.NameIdentifier)` in the controller, never from the request body.

---

## Frontend

### 1. Types

Create `frontend/src/types/profile.ts`:

```ts
export interface ProfileDto {
  id: string;
  displayName: string;
  teachingLanguages: string[];
  cefrLevels: string[];
  preferredStyle: string;
}

export interface UpdateProfileRequest {
  displayName: string;
  teachingLanguages: string[];
  cefrLevels: string[];
  preferredStyle: string;
}
```

### 2. API client

Create `frontend/src/api/profileApi.ts` — uses the existing `apiClient` (Axios instance with JWT interceptor):

```ts
export const getProfile = (): Promise<ProfileDto> =>
  apiClient.get('/api/profile').then(r => r.data);

export const updateProfile = (req: UpdateProfileRequest): Promise<ProfileDto> =>
  apiClient.put('/api/profile', req).then(r => r.data);
```

### 3. TanStack Query hooks

Create `frontend/src/hooks/useProfile.ts`:

```ts
export const useProfile = () =>
  useQuery({ queryKey: ['profile'], queryFn: getProfile });

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);  // optimistic cache update
    },
  });
```

### 4. Settings page

Create `frontend/src/pages/Settings.tsx`.

**Layout within the page:**

```
<h1>My Profile</h1>

<form onSubmit={handleSubmit}>

  <label>Display Name</label>
  <input type="text" value={displayName} onChange={...} maxLength={100} required />

  <label>Languages I Teach</label>
  <!-- multi-select: checkboxes for each of the 10 languages -->
  <!-- English, Spanish, French, German, Italian, Portuguese, Mandarin, Japanese, Arabic, Other -->

  <label>CEFR Levels I Teach</label>
  <!-- checkboxes: A1, A2, B1, B2, C1, C2 -->

  <label>Preferred Content Style</label>
  <!-- radio buttons: Formal | Conversational | Exam-prep -->

  <button type="submit" disabled={isPending}>
    {isPending ? 'Saving...' : 'Save Profile'}
  </button>

  {isSuccess && <span>Saved</span>}
  {isError && <span>Save failed. Please try again.</span>}

</form>
```

State initialised from `useProfile` query result on load. On submit, call `useUpdateProfile` mutation. No page reload needed — TanStack Query updates the cache on success.

Log via `logger.ts`:
- On page mount: `logger.info('settings page loaded')`
- On save submit: `logger.info('profile save submitted')`
- On save success: `logger.info('profile save succeeded')`
- On save error: `logger.error('profile save failed', { error })`

### 5. Routing and navigation

In `frontend/src/App.tsx`: add `/settings` route inside the existing `ProtectedRoute`:

```tsx
<Route path="/settings" element={<Settings />} />
```

In `frontend/src/components/Layout.tsx`: add a "Settings" nav link pointing to `/settings`.

---

## Playwright test

File: `e2e/tests/teacher-profile.spec.ts`

```ts
import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './auth-helper';

test('teacher can save and reload profile settings', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/settings');

  // Fill display name
  await page.fill('input[name="displayName"]', 'Test Teacher');

  // Select languages: English, Spanish
  await page.check('input[value="English"]');
  await page.check('input[value="Spanish"]');

  // Select CEFR levels: B1, B2
  await page.check('input[value="B1"]');
  await page.check('input[value="B2"]');

  // Select preferred style: Conversational
  await page.check('input[value="Conversational"]');

  // Save
  await page.click('button[type="submit"]');
  await expect(page.getByText('Saved')).toBeVisible();

  // Reload and assert persistence
  await page.reload();
  await expect(page.locator('input[name="displayName"]')).toHaveValue('Test Teacher');
  await expect(page.locator('input[value="English"]')).toBeChecked();
  await expect(page.locator('input[value="Spanish"]')).toBeChecked();
  await expect(page.locator('input[value="B1"]')).toBeChecked();
  await expect(page.locator('input[value="B2"]')).toBeChecked();
  await expect(page.locator('input[value="Conversational"]')).toBeChecked();
});
```

---

## Files to create / modify

### New files

| Path | Purpose |
|------|---------|
| `backend/LangTeach.Api/DTOs/ProfileDto.cs` | GET response DTO |
| `backend/LangTeach.Api/DTOs/UpdateProfileRequest.cs` | PUT request DTO |
| `backend/LangTeach.Api/Services/IProfileService.cs` | Service interface |
| `backend/LangTeach.Api/Services/ProfileService.cs` | Service implementation |
| `backend/LangTeach.Api/Controllers/ProfileController.cs` | API controller |
| `frontend/src/types/profile.ts` | TypeScript types |
| `frontend/src/api/profileApi.ts` | Axios API calls |
| `frontend/src/hooks/useProfile.ts` | TanStack Query hooks |
| `frontend/src/pages/Settings.tsx` | Settings page component |
| `e2e/tests/teacher-profile.spec.ts` | Playwright e2e test |

### Modified files

| Path | Change |
|------|--------|
| `backend/LangTeach.Api/Program.cs` | Register `ProfileService` as scoped |
| `frontend/src/App.tsx` | Add `/settings` route |
| `frontend/src/components/Layout.tsx` | Add Settings nav link |

---

## Pre-push checklist

- [ ] `az bicep build --file infra/main.bicep` — zero warnings, zero errors
- [ ] `cd backend && dotnet build` — zero warnings, zero errors
- [ ] `cd backend && dotnet test` — all tests pass
- [ ] `cd frontend && npm run build` — zero errors
- [ ] `npx playwright test e2e/tests/teacher-profile.spec.ts` — passes

---

## Done when

- Teacher can navigate to `/settings`, fill in all profile fields, save, reload, and see values persisted
- GET /api/profile returns correct data for the logged-in teacher only
- PUT /api/profile validates input and updates both `Teachers.DisplayName` and `TeacherSettings`
- Serilog logs show structured entries for both endpoints with teacher ID
- Playwright test passes against the local Docker stack
