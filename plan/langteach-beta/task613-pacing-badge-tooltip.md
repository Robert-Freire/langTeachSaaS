# Task 613: Add tooltip to progress dashboard pacing badge

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/613

## Problem
The 'Behind' pacing badge on the progress dashboard has no tooltip or explanation of how the threshold is calculated. Teachers don't know what triggers it.

## Acceptance Criteria
Add a tooltip on hover/tap explaining the calculation (e.g. 'Behind: fewer sessions completed than planned for this point in the course').

## Analysis

The "Behind" badge does not exist yet in the current `ProgressDashboard.tsx`. The issue was filed during sprint review anticipating the badge. This task must both add the badge logic and the tooltip.

**Available data (frontend-only, no backend change needed):**
- `completedSessions.length` — actual completed sessions
- `weeksSinceStart` — derived from first session date
- No stored target frequency field exists in the backend

**Approach:**
- Use 1 session/week as the implied standard (the most common teaching cadence)
- "Behind" = `weeksSinceStart > 4 && completedSessions < weeksSinceStart * 0.8`
  - 4-week minimum to avoid false positives in early relationship
  - 0.8 threshold gives a 20% buffer for occasional gaps
- Tooltip text: "Behind: fewer sessions completed than expected. Based on 1 session/week — less than 80% of expected sessions have been held since the start date."

## Files Changed

- `frontend/src/components/student/ProgressDashboard.tsx`
  - Extend `PacingStats` with `isBehind: boolean`
  - Compute in `computePacingStats`
  - Render badge + tooltip in pacing section using `@base-ui/react/tooltip`
- `frontend/src/components/student/ProgressDashboard.test.tsx`
  - Add test: "Behind" badge shown for student with low frequency after 4+ weeks
  - Add test: "Behind" badge NOT shown for student with adequate frequency

## Tests
- Unit: `ProgressDashboard.test.tsx` — two new cases covering the badge presence/absence
- E2E: No new e2e required (visual-only tooltip, not a data flow)
