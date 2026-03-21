# Task 105: Usage Limits (Free Tier Enforcement)

**Issue:** #105
**Priority:** P1:must
**Labels:** area:frontend, area:backend

## Problem

Free tier has no generation limit. Any registered user can generate unlimited AI content. Need per-month quota enforcement at the API level with usage visibility in the UI.

## Design Decisions

### Tracking: Dedicated `GenerationUsage` table vs counting `LessonContentBlock` rows

**Choice: Dedicated `GenerationUsage` table.** Counting LessonContentBlock rows per month would couple quota logic to content storage, make queries slower as data grows, and wouldn't survive content block deletions (teachers can regenerate/replace blocks). A lightweight tracking table is cleaner.

### Tier model: Field on Teacher vs separate Subscription entity

**Choice: `SubscriptionTier` enum field on Teacher.** We only have two tiers now (Free, Pro). A full subscription entity with billing dates, Stripe IDs, etc. would be premature. When we add payments later, we can migrate to a richer model. For now, a simple enum is sufficient.

### Quota config: Hardcoded vs DB-configurable

**Choice: `appsettings.json` configuration.** Quota limits are defined in config (`GenerationLimits:FreeTierMonthlyLimit`, `GenerationLimits:ProTierMonthlyLimit`). This is easy to change per environment without code changes or DB access. No admin UI needed yet.

### Reset mechanism: Cron job vs query-time calculation

**Choice: Query-time calculation.** Count generations where `CreatedAt >= first day of current month (UTC)`. No background jobs, no reset dates to track, no edge cases with missed jobs. Simple and correct.

## Architecture

### Backend

#### 1. New model: `GenerationUsage`

```csharp
// Data/Models/GenerationUsage.cs
public class GenerationUsage
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public ContentBlockType BlockType { get; set; }
    public DateTime CreatedAt { get; set; }
    public Teacher Teacher { get; set; } = null!;
}
```

One row per successful generation. Lightweight (no content stored). Index on `(TeacherId, CreatedAt)` for fast monthly counts. Configure `BlockType` with the same kebab-case `HasConversion` used by `LessonContentBlock` for consistency.

#### 2. Add `SubscriptionTier` to Teacher

```csharp
public enum SubscriptionTier { Free, Pro }

// Add to Teacher.cs:
public SubscriptionTier SubscriptionTier { get; set; } = SubscriptionTier.Free;
```

Default `Free` for all existing and new teachers. Migration sets existing rows to `Free`.

#### 3. New service: `IUsageLimitService`

```csharp
public interface IUsageLimitService
{
    Task<UsageStatusDto> GetUsageStatusAsync(Guid teacherId, CancellationToken ct);
    Task RecordGenerationAsync(Guid teacherId, ContentBlockType blockType, CancellationToken ct);
    Task<bool> CanGenerateAsync(Guid teacherId, CancellationToken ct);
}
```

- `GetUsageStatusAsync`: returns current count, limit, tier, reset date
- `RecordGenerationAsync`: inserts a `GenerationUsage` row
- `CanGenerateAsync`: checks if under limit (Pro tier always returns true)

#### 4. Configuration

```json
// appsettings.json
"GenerationLimits": {
    "FreeTierMonthlyLimit": 50,
    "ProTierMonthlyLimit": -1
}
```

Bound to a `GenerationLimitsOptions` class via Options pattern. Place in `Services/GenerationLimitsOptions.cs` (following the pattern of keeping options near their consumers, since no `Configuration/` directory exists).

For e2e testing, override via environment variable in `.env.e2e`: `GenerationLimits__FreeTierMonthlyLimit=2` to enable low-limit testing without code changes.

#### 5. Enforce in GenerateController

**`Generate()` method** (returns `IActionResult`), after the teacher approval check:

```csharp
if (!await _usageLimitService.CanGenerateAsync(teacherId, ct))
{
    var status = await _usageLimitService.GetUsageStatusAsync(teacherId, ct);
    Response.Headers["Retry-After"] = ((int)(status.ResetsAt - DateTime.UtcNow).TotalSeconds).ToString();
    return StatusCode(429, new { message = "Monthly generation limit reached.", resetsAt = status.ResetsAt });
}
```

After successful generation (after `SaveChangesAsync`), record usage:

```csharp
await _usageLimitService.RecordGenerationAsync(teacherId, blockType, ct);
```

**`Stream()` method** (returns `Task`, not `IActionResult`), must use raw `Response.StatusCode` pattern to match existing code style:

```csharp
if (!await _usageLimitService.CanGenerateAsync(teacherId, ct))
{
    var status = await _usageLimitService.GetUsageStatusAsync(teacherId, ct);
    Response.StatusCode = 429;
    Response.ContentType = "application/json";
    Response.Headers["Retry-After"] = ((int)(status.ResetsAt - DateTime.UtcNow).TotalSeconds).ToString();
    await Response.WriteAsync(
        JsonSerializer.Serialize(new { message = "Monthly generation limit reached.", resetsAt = status.ResetsAt }),
        ct);
    return;
}
```

Note: The streaming endpoint does NOT persist a `LessonContentBlock` after streaming (it only logs success). Usage recording should happen after the stream loop completes without error (after the `[DONE]` write, before the method returns from the try block).

#### 6. New API endpoint: `GET /api/usage`

Returns `UsageStatusDto` for the current user:

```csharp
public record UsageStatusDto(
    int UsedThisMonth,
    int MonthlyLimit,    // -1 for unlimited
    string Tier,         // "Free" or "Pro"
    DateTime ResetsAt    // first of next month UTC
);
```

#### 7. Extend ProfileDto

Add usage fields to `ProfileDto` so the frontend gets quota info on profile load (avoids a separate API call on every page):

```csharp
public record ProfileDto(
    // ... existing 8 fields ...
    int GenerationsUsedThisMonth,
    int GenerationsMonthlyLimit,  // -1 for unlimited
    string SubscriptionTier
);
```

Since `ProfileDto` is a positional record, adding parameters changes the constructor signature. `ProfileService.MapToDto` must accept usage data as additional parameters. `ProfileService` will depend on `IUsageLimitService` to fetch usage counts in `GetProfileAsync` and `UpdateProfileAsync`.

### Frontend

#### 8. Update ProfileDto type and useProfile

Add the three new fields to the TypeScript `ProfileDto` interface in `types/profile.ts`.

#### 9. Usage indicator component

`UsageIndicator` component in `components/UsageIndicator.tsx`, integrated into `AppShell.tsx` sidebar (above the user/logout section):
- Shows "X / N generations this month" with a progress bar
- For Pro tier: shows "Pro" badge, no limit display
- When close to limit (>80%): yellow warning color
- When at limit: red, with "Upgrade" prompt

#### 10. Handle 429 in both generation paths

There are two frontend code paths that call the generation streaming endpoint:

**`useGenerate.ts` hook** (used by `GeneratePanel`): When the streaming response returns 429, parse the error body for the reset date, set a specific error state (`"quota_exceeded"`), display a clear message.

**`lib/streamText.ts` utility** (used by `FullLessonGenerateButton`): Currently throws a generic `Error` on non-2xx. Must detect 429 specifically and throw a typed/distinguishable error (e.g., `QuotaExceededError` class or an error with a `code` property) so callers can differentiate quota exhaustion from other failures.

**`FullLessonGenerateButton.tsx`**: Must catch `QuotaExceededError` from `streamText` and show quota-specific messaging. Should also pre-check quota from profile data before launching parallel generations (to avoid burning remaining quota mid-batch).

#### 11. GeneratePanel: disable when quota exhausted

- Read quota from profile context
- When `usedThisMonth >= monthlyLimit` (and limit != -1): disable generate button, show upgrade prompt
- Invalidate profile query after each successful generation to update the counter

### Database Migration

Single migration: `AddUsageLimitsAndSubscriptionTier`
- Creates `GenerationUsage` table with index on `(TeacherId, CreatedAt)`
- Configures `BlockType` with kebab-case conversion (matching `LessonContentBlock` pattern)
- Adds `SubscriptionTier` column to `Teachers` (default 0 = Free)
- Registers `GenerationUsage` in `AppDbContext`

## Test Plan

### Backend unit tests (`UsageLimitServiceTests`)
- Monthly count query returns correct count for current month only (not previous months)
- `CanGenerateAsync` returns false when at limit, true when under
- `CanGenerateAsync` always returns true for Pro tier
- `RecordGenerationAsync` inserts a row
- Month boundary edge case (last day of month vs first day of next)

### Frontend unit tests
- `UsageIndicator.test.tsx`: renders count, progress bar colors at thresholds (normal/warning/exhausted), Pro badge, upgrade prompt when at limit
- `useGenerate.test.ts`: update existing tests to cover 429 response handling, `quota_exceeded` error state
- `GeneratePanel.test.tsx`: update existing tests to cover disabled state when quota exhausted
- `FullLessonGenerateButton` (if modified significantly): quota pre-check, error handling for `QuotaExceededError`

### E2E tests (`usage-limits.spec.ts`)
1. **Happy path**: Generate content, verify usage counter increments in the UI
2. **Limit enforcement**: With `GenerationLimits__FreeTierMonthlyLimit=2` set in e2e env, generate twice, verify third attempt shows quota exceeded message and generate button is disabled

## File Changes Summary

### New files
- `backend/LangTeach.Api/Data/Models/GenerationUsage.cs`
- `backend/LangTeach.Api/Data/Models/SubscriptionTier.cs`
- `backend/LangTeach.Api/Services/UsageLimitService.cs` (+ `IUsageLimitService.cs`)
- `backend/LangTeach.Api/Services/GenerationLimitsOptions.cs`
- `backend/LangTeach.Api/Controllers/UsageController.cs`
- `backend/LangTeach.Api/Migrations/[timestamp]_AddUsageLimitsAndSubscriptionTier.cs`
- `frontend/src/components/UsageIndicator.tsx` (+ `UsageIndicator.test.tsx`)
- `e2e/tests/usage-limits.spec.ts`

### Modified files
- `backend/LangTeach.Api/Data/Models/Teacher.cs` (add SubscriptionTier field)
- `backend/LangTeach.Api/Data/AppDbContext.cs` (add GenerationUsage DbSet + config with BlockType conversion)
- `backend/LangTeach.Api/Controllers/GenerateController.cs` (quota check + record usage, both endpoints)
- `backend/LangTeach.Api/Services/ProfileService.cs` (depend on IUsageLimitService, pass usage to MapToDto)
- `backend/LangTeach.Api/DTOs/ProfileDto.cs` (add 3 usage fields to positional record)
- `backend/LangTeach.Api/Program.cs` (register UsageLimitService + GenerationLimits options)
- `backend/appsettings.json` (add GenerationLimits section)
- `frontend/src/types/profile.ts` (add usage fields to interface)
- `frontend/src/hooks/useGenerate.ts` (handle 429 as quota_exceeded)
- `frontend/src/lib/streamText.ts` (detect 429, throw typed QuotaExceededError)
- `frontend/src/components/lesson/GeneratePanel.tsx` (disable on quota, invalidate profile)
- `frontend/src/components/lesson/FullLessonGenerateButton.tsx` (quota pre-check, QuotaExceededError handling)
- `frontend/src/components/AppShell.tsx` (render UsageIndicator in sidebar)
- `frontend/src/hooks/useGenerate.test.ts` (429 handling tests)
- `frontend/src/components/lesson/GeneratePanel.test.tsx` (disabled state tests)

## Implementation Order

1. Backend model + migration + config
2. UsageLimitService
3. Enforce in GenerateController (both endpoints, respecting return type differences)
4. Usage API endpoint + extend ProfileDto + update ProfileService
5. Frontend: update types, handle 429 in both useGenerate and streamText
6. Frontend: UsageIndicator component, integrate into AppShell
7. Frontend: integrate into GeneratePanel and FullLessonGenerateButton
8. Unit tests (backend service, frontend components/hooks)
9. E2E tests
