# Task 850: Visual Polish Batch

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/850

## Fixes

### 1. Sentinel guard in SENSITIVITIES (StudentProfileTab.tsx)
- Add `isSentinel(s)` helper: true if string starts with `[` and ends with `]`
- Filter `personalNotes` through sentinel check before rendering in Teacher's Working Memory

### 2. Difficulty label truncation (ProgressDashboard.tsx)
- Line 362: remove `truncate max-w-[140px]` from the difficulty description span
- Tooltip already exists for hover, so full text shows on hover

### 3. PREVIEW badge contrast (StudyView.tsx)
- Line 41: change badge from grey outline to indigo outline style

### 4. Cancelled-state callout (LogSession.tsx)
- Line ~1479: replace italic grey text with amber callout box

### 5. Official Level select
- Already uses shadcn Select via PR #877 (task #840). AC already satisfied.

### 6. Spec fixture update
- Add `@visual student detail - overview with sessions` test to student-detail.visual.spec.ts
- Uses Diego Seed (who has session logs), screenshots to `screenshots/student-detail-overview-sessions.png`

## Tests to add/update
- StudentProfileTab.test.tsx: add test for sentinel guard (personalNotes = '[visual-seed]' -> not shown)
- LogSession.test.tsx: update cancelled-state test to check for amber callout
- StudyView.tsx: no existing unit test file; skip (covered by visual e2e)
- ProgressDashboard: tooltip test already exists; no additional test needed

## E2E
- student-detail.visual.spec.ts: add overview-with-sessions screenshot test

## Review routing
- area:frontend: architecture-reviewer + review-ui
