# Task 678 — Progress Tab

## Issue
feat: student detail Progress tab (skill imbalance, pacing, difficulties evolution)

## Scope
Frontend-only. All data comes from already-fetched `student` and `sessions` in `StudentDetail`.
No new backend endpoints needed.

## Design Reference
`plan/langteach-beta/stitch-design-system/student-detail/4. progress/`

## Data Sources

| Section | Source |
|---|---|
| Skill bars | `student.skillLevelOverrides` (Record<string,string>), baseline = `student.cefrLevel` |
| Pacing | `sessions` array (filter by isCancelled + statusName) |
| Difficulties | `student.difficulties` + session `mentionedDifficultyPairs` (JSON string) |
| Coming Soon cards | Static UI only |

## CEFR numeric mapping
A1=1, A2=2, B1=3, B2=4, C1=5, C2=6.
Bar width = (cefrNum / 6) * 100%. Baseline line at (baselineNum / 6) * 100%.
Color: skill >= baseline → primary (#3525CD). Below → lighter (primary-container/40).

## Skill order
Reading, Speaking, Listening, Writing (matches Stitch design).

## Pacing formulas
- completedSessions = sessions where !isCancelled && statusName === 'Confirmed' && sessionDate
- cancelledSessions = sessions where isCancelled
- firstDate = earliest sessionDate across all sessions
- weeksSinceStart = (now - firstDate) / 7 days
- frequency = completedSessions.length / max(1, weeksSinceStart), 1 decimal
- cancellationRate = cancelled.length / max(1, all.length) * 100, rounded

## Difficulty classification
- Parse `mentionedDifficultyPairs` (JSON string) from sessions in last 30 days (confirmed, not cancelled, dated)
- Build Set of `${Competency}|${Subcategory}` strings
- Difficulty.status === 'Covered' → Covered (green)
- Difficulty.status === 'Active' + in recent set → Working (indigo)
- Difficulty.status === 'Active' + not in recent set → Stale (amber)

## Files changed

| File | Change |
|---|---|
| `frontend/src/components/student/ProgressDashboard.tsx` | Complete rewrite — new design, new props |
| `frontend/src/components/student/ProgressDashboard.test.tsx` | Rewrite tests for new component |
| `frontend/src/pages/StudentDetail.tsx` | Pass student+sessions to ProgressDashboard |
| `frontend/src/api/progress.ts` | Delete (no longer used) |
| `e2e/tests/students.spec.ts` | Update progress tab e2e test |

## Acceptance criteria (from issue)
- [x] Progress tab renders on student detail page
- [x] Skill Imbalance bars with CEFR badges and baseline reference
- [x] Baseline label uses "GENERAL" or "BASELINE" (not "TARGET")
- [x] No AI annotations or trend labels on skill bars
- [x] Pacing Analytics: total sessions, frequency, start date, cancellation rate
- [x] Cancellation rate is a number only (no trend dot)
- [x] Difficulties Evolution section (covered, stale, active)
- [x] Three "coming soon" placeholder cards (greyed out)
- [x] No Streak counter, no Learning Track label
- [x] Follows Stitch design
