# Task 478: Add visual spec coverage for SessionLogDialog in edit mode

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/478

## Goal
Add a visual spec test that opens `SessionLogDialog` in edit mode via the Edit button in `SessionHistoryTab`, captures a snapshot with pre-populated fields and the "Save changes" submit label.

## Context

Edit mode was added in #472. Key test IDs:
- `data-testid="edit-session-button"` — Edit button in expanded session detail
- `data-testid="session-log-dialog"` — the dialog
- `data-testid="submit-session-log"` — submit button (text: "Save changes" in edit mode)
- Dialog title: "Edit Session"

Scenario student: **Diego Seed** (with-history, 2 seeded sessions). Existing spec already resolves `diegoId` in `beforeAll`.

## Changes

Single file: `e2e/tests/visual/session-history.visual.spec.ts`

Add one test case after the existing expanded-entry test:
1. Navigate to Diego Seed's student detail
2. Open History tab, wait for session list
3. Expand first session entry (click `session-entry-toggle`)
4. Wait for `session-entry-detail` to be visible
5. Click `edit-session-button`
6. Wait for `session-log-dialog` to be visible
7. Assert submit button text is "Save changes"
8. Assert `session-date` input is non-empty (pre-populated)
9. Take screenshot `screenshots/session-history-edit-dialog.png`
10. Assert no console errors

## Acceptance criteria mapping
- [x] Opens via Edit button in SessionHistoryTab
- [x] Snapshot captures pre-populated fields and "Save changes" label
- [x] Uses Diego Seed (seeded sessions)
- [x] No new infrastructure needed
