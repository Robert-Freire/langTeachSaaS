# Task 730: Dashboard Polish — Hero Card, Roster Signals, Followup Urgency

**Issue:** #730
**Sprint branch:** sprint/ui-redesign-student-polish
**Worktree:** task-t730-dashboard-polish

## Objective

Polish the Dashboard across four zones: hero card (Start CTA + structured briefing + urgency badge), student roster (signals + L1 + sort + count), pending followups (overdue urgency), and empty agenda (This Week view).

## Files Changed

### Backend
- `backend/LangTeach.Api/DTOs/DashboardDtos.cs` — extend `NextSessionDto` and `DashboardDto`
- `backend/LangTeach.Api/Services/DashboardService.cs` — populate new fields (only one call site: line 59)
- `backend/LangTeach.Api.Tests/Services/DashboardServiceTests.cs` — update tests

### Frontend
- `frontend/src/api/dashboard.ts` — add new fields to TS types
- `frontend/src/pages/Dashboard.tsx` — pass `upcomingThisWeek` prop to TodayAgenda
- `frontend/src/components/dashboard/NextSessionHero.tsx` — Start CTA, briefing, urgency
- `frontend/src/components/dashboard/StudentRoster.tsx` — signals, L1, sort, count
- `frontend/src/components/dashboard/PendingFollowups.tsx` — overdue urgency
- `frontend/src/components/dashboard/TodayAgenda.tsx` — empty-state This Week view
- `frontend/src/components/dashboard/NextSessionHero.test.tsx` — update tests
- `frontend/src/components/dashboard/StudentRoster.test.tsx` — update tests
- `frontend/src/components/dashboard/PendingFollowups.test.tsx` — update tests
- `frontend/src/components/dashboard/TodayAgenda.test.tsx` — update tests

## Backend Changes

### 1. `DashboardDtos.cs` — Extend NextSessionDto and DashboardDto

```csharp
public record NextSessionDto(
    Guid SessionLogId,
    Guid StudentId,
    string StudentName,
    string StudentCefrLevel,
    DateTime SessionDate,
    string? PlannedContent,
    string? LastSessionNotes,        // GeneralNotes (student response / how it went)
    DateTime? LastSessionDate,
    string? HomeworkAssigned,        // KEEP: homework on the upcoming session (pre-planned)
    string? PreviousHomeworkStatus,
    List<string> LastSessionTopicTags,    // NEW: TopicTags from lastPast session
    string? LastSessionHomework,          // NEW: HomeworkAssigned from lastPast session
    List<string> LastSessionFollowups     // NEW: pending followup text from lastPast session
);

// NEW: minimal upcoming session DTO for the This Week view
public record UpcomingSessionDto(
    Guid SessionLogId,
    Guid StudentId,
    string StudentName,
    string StudentCefrLevel,
    DateTime SessionDate,
    string? PlannedContent
);

public record DashboardDto(
    NextSessionDto? NextSession,
    List<TodaySessionDto> TodaySessions,
    List<ActiveStudentDto> ActiveStudents,
    List<TeacherFollowupDto> PendingFollowups,
    List<UpcomingSessionDto> UpcomingThisWeek  // NEW: sessions in next 7 days (excl. today)
);
```

### 2. `DashboardService.cs` — Populate new fields

**`GetNextSessionAsync` additions:**
- After fetching `lastPast`, deserialize `lastPast.TopicTags` using `System.Text.Json`:
  `JsonSerializer.Deserialize<List<string>>(lastPast.TopicTags) ?? []`
- Include `lastPast.HomeworkAssigned` as `LastSessionHomework`
- Query `TeacherFollowup` where `SourceSessionLogId == lastPast.Id && Status != "done"` for `LastSessionFollowups`
  - `TeacherFollowup.Status` is a plain `string` ("pending" / "done"), NOT an enum. Use string literal comparison.
  - DbSet confirmed as `_db.TeacherFollowups` (AppDbContext line 27)

**New `GetUpcomingThisWeekAsync` method:**
```csharp
private async Task<List<UpcomingSessionDto>> GetUpcomingThisWeekAsync(...)
```
- Query sessions where `SessionDate.Value.Date > today` AND `SessionDate.Value.Date <= today.AddDays(7)` (inclusive upper bound — "within next 7 calendar days, not counting today")
- Not cancelled, not deleted
- Take first 5, ordered by `SessionDate` ascending
- Map to `UpcomingSessionDto`

## Frontend Changes

### 1. `frontend/src/api/dashboard.ts`

Add to `NextSession`:
```ts
lastSessionTopicTags: string[]
lastSessionHomework: string | null
lastSessionFollowups: string[]
```

Add `UpcomingSession` interface and `upcomingThisWeek: UpcomingSession[]` to `DashboardData`.

### 2. `NextSessionHero.tsx` — Hero card polish

**Urgency badge (adaptive):**
```
diff < 0              → 'NOW'           (green)
diff <= 2 hours       → 'IN X MIN/H'   (green indigo gradient, same as now)
diff <= 24 hours      → 'TODAY, HH:MM' (neutral zinc, no gradient)
diff <= 7 days        → 'IN Xd'        (neutral zinc, no gradient, no pill)
diff > 7 days         → show date only  (no badge, just date text)
```
Green gradient pill only for sessions within 2 hours. Neutral/no pill otherwise.

**"Start session" CTA:**
- Primary gradient button (indigo) next to "View profile" link
- Navigate to `/students/:id/log-session`
- Text: "Start session"
- Use same gradient style as design system primary buttons

**Last Session Briefing block (replace raw notes with structured bullets):**
Replace the current `lastSessionNotes` text block with 4 structured bullet lines:
1. **Topics** (from `lastSessionTopicTags`): comma-joined tags, or fall back to first ~80 chars of `lastSessionNotes` if tags empty
2. **Response** (from `lastSessionNotes`): show as-is, labeled "How it went"
3. **Homework** (from `lastSessionHomework`): show with warm amber accent
4. **Promises** (from `lastSessionFollowups`): comma-joined followup texts

Show a bullet only if the data is non-empty. Section is hidden entirely if all 4 are empty.

**Homework Status card:**
The current homework grid cell becomes a standalone warm-toned mini-card:
- Background: warm amber tint (`bg-amber-50` or similar warm tone)
- Separate visual weight from the rest of the briefing
- Label: "Homework pending" or "Homework · [status]"
- Show `homeworkAssigned` text (next session pre-planned) alongside `previousHomeworkStatus`

### 3. `StudentRoster.tsx` — Signals, L1, sort, count

**Student count:**
- Under "Student Roster" heading: `{students.length} active enrollment{plural}`
- Subtitle style (zinc-400, label-sm)

**Sort control:**
- Dropdown (same style as Students list sort)
- Options: "Last Session" (default), "Next Session", "Name"
- Sorting logic:
  - Last Session: desc by `lastSessionDate` (null last)
  - Next Session: asc by `nextSessionDate` (null last)
  - Name: asc alphabetical
- Remove hardcoded sort-by-nextSession that currently truncates to 10

**L1 column:**
- After Level column header "L1"
- Display first native language from `nativeLanguages[0]` or `—`
- Hidden on small screens (`hidden sm:table-cell`)

**Activity Signal column:**
- After L1 (or before Pending)
- Header "Signal"
- Build signals from `ActiveStudent` dashboard data:
  - Inactive Xd: `lastSessionDate` gap >= 14 days AND no `nextSessionDate`
  - Cancelled 2x: `cancelledSessionsLast30Days >= 2` (red dot)
  - Review pending: `pendingTodos.length > 0`
- Use same badge style as Students page (pill, colored bg)
- Show first signal only (most urgent first: Cancelled > Inactive > Review)
- Hidden on mobile (`hidden md:table-cell`)

### 4. `PendingFollowups.tsx` — Overdue urgency

Replace the subtle age badge with visual urgency indicators:
- **Priority dot** (colored circle, larger than current dot): red if overdue (> 3d), amber if recent
- **Age badge redesign**: Replace "1d" with "X DAYS OVERDUE" for items > 3 days old
  - Format: "TODAY", "1D OLD", "3D OVERDUE", "7D OVERDUE"
  - Color: green (0d), amber (1-3d), red (>3d)
  - The dot next to the item should match this color

### 5. `TodayAgenda.tsx` — Empty state

When `sessions.length === 0`:
- If `upcomingThisWeek` is non-empty: render a "This Week" mini-view
  - Section label: "This Week" (instead of "Today")
  - Show next 3-5 sessions with date + time + student name + CEFR badge
  - Same row style as today's sessions
- If both empty: render a brief "No sessions this week" message (not the large white block)

Requires passing `upcomingThisWeek` prop from Dashboard.tsx.

## Tests

### Backend
- `DashboardServiceTests.cs`: add tests for:
  - `LastSessionTopicTags` populated from lastPast session
  - `LastSessionHomework` populated from lastPast session
  - `LastSessionFollowups` populated (only `Status != "done"` followups with matching `SourceSessionLogId`)
  - `UpcomingThisWeek` returns sessions in next 7 calendar days (not today)

### Frontend
- `NextSessionHero.test.tsx`:
  - Add new fields to `makeSession()` factory (`lastSessionTopicTags`, `lastSessionHomework`, `lastSessionFollowups`)
  - Test adaptive urgency: session in 30min → green pill, session today in 4h → neutral, session in 3d → no badge
  - Test Start session link renders and points to `/students/student-1/log-session`
  - Test briefing bullets: topics, last-session homework, promises render when present
- `StudentRoster.test.tsx`:
  - Test sort default (Last Session order)
  - Test L1 column renders `nativeLanguages[0]`
  - Test signal badge "Cancelled 2x" for `cancelledSessionsLast30Days >= 2`
  - Test signal badge "Review pending" for `pendingTodos.length > 0`
  - Test student count label (`N active enrollment(s)`)
- `PendingFollowups.test.tsx`:
  - Test "DAYS OVERDUE" label for items > 3 days old
  - Test red dot for overdue items
- `TodayAgenda.test.tsx`:
  - Test This Week fallback renders when `sessions=[]` and `upcomingThisWeek` has entries
  - Test "No sessions this week" renders when both empty

### E2E (happy path)
- New e2e test in `frontend/e2e/` (or existing dashboard test file) covering:
  - Dashboard loads and hero card shows "Start session" button
  - Clicking "Start session" navigates to log-session page
  - (If data available) Activity Signal badge renders in roster

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| Start session CTA | Primary gradient Link in hero header |
| Last Session Briefing | 4-bullet block from backend new fields |
| Homework as distinct warm card | Separate amber-tinted card in hero |
| Urgency badge adaptive | `formatUrgency()` function with thresholds |
| Activity Signal column | `buildRosterSignal()` from ActiveStudent data |
| L1 column | `nativeLanguages[0]` in roster table |
| Sort control (default Last Session) | Dropdown state in StudentRoster |
| Student count | Count label under heading |
| Overdue followup urgency | Redesigned age badge + colored dot |
| Empty agenda This Week | TodayAgenda with `upcomingThisWeek` prop |

## Notes / Risks

- **TeacherFollowup table name in DbContext**: verify navigation property name before using `_db.TeacherFollowups`
- **Signal logic duplication**: Dashboard roster signals are a simplified subset of Students.tsx signals (no NEW/ExamPrep since we lack `createdAt`/`shortTermObjectives`). This is acceptable; if a shared component is wanted, defer to a separate issue.
- **Empty agenda "This Week" view**: requires adding `UpcomingThisWeek` to `DashboardDto`. This is a small extension to the existing endpoint, not a new data source.
