# Task 905 — HomeworkStatus enum label fix

## Problem

The `HomeworkStatus` enum values (`NotApplicable`, `NotDone`, `Partial`, `Done`) were rendered as raw PascalCase strings in several UI locations instead of human-readable labels.

## Solution

Created a single source-of-truth mapping in `frontend/src/utils/homeworkStatusUtils.ts`:
- `HomeworkStatus` type union
- `getHomeworkStatusInfo(status: HomeworkStatus)` — exhaustiveness-checked switch
- `getHomeworkStatusInfoSafe(status: string | null | undefined)` — safe API-boundary variant
- `isHomeworkApplicable(status)` — replaces `status !== 'NotApplicable'` comparisons
- `HOMEWORK_STATUS_PILL_OPTIONS` — for the LogSession pill buttons

## Files changed

- `frontend/src/utils/homeworkStatusUtils.ts` — new util (source of truth)
- `frontend/src/utils/homeworkStatusUtils.test.ts` — exhaustiveness-checked unit tests
- `frontend/src/utils/homeworkStatusStyles.ts` — `HOMEWORK_STATUS_INFO` now delegates to util
- `frontend/src/pages/LogSession.tsx` — `PREV_HOMEWORK_STATUSES` now uses `HOMEWORK_STATUS_PILL_OPTIONS`
- `frontend/src/components/dashboard/NextSessionHero.tsx` — removed inline `homeworkStatusLabel`, uses util
- `frontend/src/components/session/SessionHistoryTab.tsx` — uses `isHomeworkApplicable` from util
- `frontend/src/components/student/LessonHistoryCard.tsx` — uses util label mapping, `isHomeworkApplicable`
- `frontend/src/components/dashboard/NextSessionHero.test.tsx` — updated mock to use string enum name

## Display labels

- `NotApplicable` → "Not applicable"
- `NotDone` → "Not done"
- `Partial` → "Partial"
- `Done` → "Done"

## Notes

The legacy session edit dialog from the UI sweep screenshot no longer exists in the codebase (Sessions page navigates to student detail, not a modal). The AC around the dialog is satisfied by the fact that no dialog with a raw `<select>` for homework status exists.
