# Task 737 — Extract sessionTitle and date helpers to shared frontend utils

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/737

## Goal
Extract duplicated local helpers from `SessionHistoryTab.tsx` and `StudentOverviewTab.tsx` into shared utility modules.

## Changes

### 1. `frontend/src/utils/formatDate.ts`
Add two new exports:
- `formatMonth(dateStr: string | null): string` — short month, uppercase (e.g. "APR")
- `formatDay(dateStr: string | null): string` — day number as string (e.g. "15")

### 2. `frontend/src/lib/sessionUtils.ts` (new file)
Export two functions using `SessionLog` from `../../api/sessionLogs`:
- `getSessionTitle(session: SessionLog): string` — extracted from `sessionTitle()` in SessionHistoryTab; falls back to date-formatted string
- `getDisplayTitle(session: SessionLog): string` — extracted from `getDisplayTitle()` in StudentOverviewTab; falls back to truncated content

### 3. `frontend/src/components/session/SessionHistoryTab.tsx`
- Remove local `formatMonth`, `formatDay`, `sessionTitle`
- Import `formatMonth`, `formatDay` from `../../utils/formatDate`
- Import `getSessionTitle` from `../../lib/sessionUtils`, replace `sessionTitle(...)` calls

### 4. `frontend/src/components/student/StudentOverviewTab.tsx`
- Remove local `getDisplayTitle`
- Import `getDisplayTitle` from `@/lib/sessionUtils`, replace calls

## Tests
- All existing tests must pass (no new test files needed for XS pure-refactor)
- Frontend unit tests for formatDate.ts additions in `frontend/src/utils/formatDate.test.ts` if it exists
