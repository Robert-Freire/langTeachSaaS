# Task 793 — Dashboard UX Polish

**Issue:** #793  
**Branch:** worktree-task-t793-dashboard-ux-polish  
**Sprint:** sprint/ui-redesign-student-polish

## Source
`plan/ui-redesign-feedback3.md` findings N1-N5, S1, S3-S6, SD3.

## Acceptance Criteria Summary

### Roster row navigation (HIGH)
- Clicking anywhere on a roster row navigates to `/students/:id`
- Fix "Today -> Today" display (show just "Today" when both dates are the same day)
- Strengthen row hover contrast

### Followup improvements (MEDIUM)
- Student name chip links to `/students/:id`
- Mark-done dot: `title="Mark as done"` + `hover:scale-125`
- Show student chip only when different from previous item (grouping)
- "SEE ALL (N)" link in card header when there are many followups (> 5)

### Hero Stitch alignment (MEDIUM)
- Identity subtitle under student name: "{language} . Session #{count}"
  - Backend: extend `NextSessionDto` with `TeachingLanguage` (from `Student.LearningLanguage`) and `TotalSessionCount` (count of completed sessions)
- "View profile" -> secondary button style (not ghost text link)
- "Start session" -> add play icon
- Remove `border border-amber-100` from homework status card
- "CALENDAR VIEW" dead link right-aligned in Today's Agenda card header

## Implementation Plan

### Backend
1. `DashboardDtos.cs`: add `TeachingLanguage` (string?) and `TotalSessionCount` (int) to `NextSessionDto`
2. `DashboardService.cs`: populate them in `GetNextSessionAsync`
   - `TeachingLanguage`: `next.Student.LearningLanguage`
   - `TotalSessionCount`: count completed/past sessions for that student

### Frontend
3. `dashboard.ts`: add `teachingLanguage: string | null` and `totalSessionCount: number` to `NextSession`
4. `NextSessionHero.tsx`: subtitle, button styles, remove border
5. `StudentRoster.tsx`: row click, Today fix, hover contrast
6. `PendingFollowups.tsx`: chip link, dot tooltip, grouping, SEE ALL
7. `TodayAgenda.tsx`: CALENDAR VIEW link

### Tests
- `DashboardServiceTests.cs`: assert `TeachingLanguage` and `TotalSessionCount`
- `NextSessionHero.test.tsx`: assert subtitle presence
- `StudentRoster.test.tsx`: assert row is clickable (cursor-pointer / navigate)
- `PendingFollowups.test.tsx`: assert chip is a link, SEE ALL appears

## Notes
- `Student.TeachingLanguage` in the issue body is actually `Student.LearningLanguage` in the model.
- "SEE ALL" link uses href="#" (no followup list page exists yet)
- "CALENDAR VIEW" link uses href="#" (no calendar screen exists yet)
