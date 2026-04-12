# Task 677: Student Detail Sessions Tab

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/677

## Goal
Redesign the `SessionHistoryTab` component to match the Stitch design for the Sessions tab. Add header stats, toolbar with filters/search, Stitch-style collapsed/expanded session cards, voice note indicator, and pagination.

## Infrastructure gap (approved to fix inline)
`SessionLogDto` does not expose whether a session has an associated voice note (stored in `VoiceNoteApplications`). Will add `HasVoiceNote: bool` to `SessionLogDto` and compute it in `ListAsync` via a subquery.

## Design reference
- `plan/langteach-beta/stitch-design-system/student-detail/3. sessions/screen.png`
- `plan/langteach-beta/stitch-design-system/student-detail/3. sessions/code.html`
- `plan/langteach-beta/student-screen-field-mapping.md` (Sessions tab section)

## Backend changes

### 1. `SessionLogDto` -- add `HasVoiceNote`
File: `backend/LangTeach.Api/DTOs/SessionLogDtos.cs`
- Add `bool HasVoiceNote` as last positional param of the record.

### 2. `SessionLogService` -- compute `HasVoiceNote` in `ListAsync`
File: `backend/LangTeach.Api/Services/SessionLogService.cs`
- `ToDto(SessionLog sl)` -> `ToDto(SessionLog sl, bool hasVoiceNote = false)` -- add field at end of `new SessionLogDto(...)`.
- `ListAsync`: change `.Select(sl => ToDto(sl))` to a two-step query: project `{Log, HasVoiceNote}` using `_db.VoiceNoteApplications.Any(vna => vna.SessionLogId == sl.Id)` subquery, then map with `ToDto(x.Log, x.HasVoiceNote)`. EF will translate `Any` to a correlated EXISTS subquery.
- `GetByIdAsync`, `CreateAsync`, `UpdateAsync`: pass `hasVoiceNote: false` (these are not used for the list display).

### 3. Backend tests
File: `backend/LangTeach.Api.Tests/Services/SessionLogServiceTests.cs`
- Add test: `ListAsync_ReturnsTrueHasVoiceNote_WhenVoiceNoteApplicationExists` -- seed a session + VoiceNoteApplication, verify DTO has `HasVoiceNote = true`.

## Frontend changes

### 4. `SessionLog` interface -- add `hasVoiceNote`
File: `frontend/src/api/sessionLogs.ts`
- Add `hasVoiceNote: boolean` to `SessionLog` interface.

### 5. Redesign `SessionHistoryTab`
File: `frontend/src/components/session/SessionHistoryTab.tsx`

#### State
- `searchQuery: string` -- filters by title + actualContent
- `statusFilter: 'all' | 'completed' | 'cancelled' | 'draft'`
- `topicFilter: string` -- filters sessions whose tags include this topic
- `visibleCount: number` -- starts at 15, increments by 15 on "Load earlier"

#### Total Hours
- Computed from `sessions.reduce((sum, s) => sum + (s.duration ?? 0), 0) / 60`
- Shown in header stat card only when > 0

#### Toolbar
- Search input (searches `session.title` + `session.actualContent`)
- Date Range button (opens Popover with two `input[type=date]` fields for fromDate/toDate)
- Status filter: button group (All / Completed / Cancelled / Draft)
  - Completed: `!isCancelled && statusName === 'Confirmed'`
  - Cancelled: `isCancelled`
  - Draft: `statusName === 'Draft'`
- Topic filter: button that opens Popover with checkboxes for unique tags

#### Session feed
Sorted most-recent-first (already done). Filtered. Sliced to `visibleCount`.

#### Collapsed row design (per Stitch)
```
[Date badge] [Title]  [Status badge]              [Duration] [Mic?] [Chevron]
             [actualContent snippet line-clamp-1]
             [topic tag chips]
             [Next: nextSessionTopics (if set)]    <- keep testid next-session-topics-preview
```

Date badge: `w-12 h-12` box, month abbrev + day number.
Title: `session.title` or `Session, ${formatMonthDay(session.sessionDate)}` fallback.
Status badge: Completed (emerald), Cancelled (zinc, title has line-through), Draft (amber).
Cancelled style: `opacity-60 grayscale` on the whole row.
Duration badge: `{duration} min` (if set).
Mic icon: small mic icon (if `hasVoiceNote`).

#### Expanded card design (per Stitch)
Grid: 2/3 left + 1/3 right.

Left column:
- SESSION NARRATIVE label + `actualContent` (italic, text-on-surface-variant)
- Topic tag chips
- TEACHER NOTES section (indigo left-border) if `generalNotes`
- Planned content section (if `plannedContent` != `actualContent`)
- Level reassessment (if present)
- Linked lesson link (if present)

Right column:
- Homework card (surface-container-low):
  - "PREVIOUS HOMEWORK STATUS" sub-label + status badge
  - Divider
  - "HOMEWORK ASSIGNED" sub-label + text
- Next Session Plan card (if `nextSessionTopics`):
  - "NEXT SESSION PLAN" label
  - topic text

Actions row (bottom of expanded card):
- Start Next Session button (if `nextSessionTopics`)
- Edit button (`data-testid="edit-session-button"`)
- Delete button (`data-testid="delete-session-button"`) with AlertDialog

#### Pagination footer
- "Showing X of Y sessions." text
- "Load earlier sessions" button (only if `filteredSessions.length > visibleCount`)

### 6. Unit tests -- update + add
File: `frontend/src/components/session/SessionHistoryTab.test.tsx`

**Update `SESSION_BASE`:** add `hasVoiceNote: false`.

**Update "shows inline preview" test:**  
New expectation: `actualContent` shown with `line-clamp-1`; `plannedContent` NOT in collapsed view.

**Add new tests:**
- `it('shows Total Hours stat when sessions have duration')` -- duration 60 -> "1 h"
- `it('hides Total Hours stat when all sessions have null duration')`
- `it('filters sessions by search query')` -- type in search input, check only matching session visible
- `it('shows only cancelled sessions when Cancelled filter active')`
- `it('shows pagination Load earlier button when sessions exceed page size')`
- `it('shows mic icon when hasVoiceNote is true')` -- collapsed row shows mic
- `it('shows duration badge when duration is set')` -- "60 min" text visible
- `it('shows fallback title when session.title is null')` -- "Session," prefix in title
- `it('shows session.title when set')` -- title text in collapsed row

### 7. E2E test
File: `e2e/tests/students.spec.ts`
Add test block for Sessions tab redesign:
- Navigate to student with sessions (Marco or existing demo student)
- Click Sessions tab
- Verify: session-history-list visible, Total Hours stat visible, session-entry visible
- Verify search: type a search term, list updates
- Verify status filter: click "Cancelled", only cancelled sessions visible (or empty state)
- Verify expand: click a session entry, verify detail panel opens

## Acceptance criteria checklist
- [ ] Sessions tab renders on student detail page
- [ ] Header shows Total Hours computed from session durations
- [ ] Toolbar: search, date range, status filter, topic filter all functional
- [ ] Collapsed rows show date badge, title, status badge, snippet, tags, duration, chevron
- [ ] Expanded cards show full narrative, teacher notes, homework card, next session plan
- [ ] Homework card clearly separates "Assigned" from "Previous Status"
- [ ] Cancelled sessions greyed out with 0 min duration display
- [ ] Voice note indicator (mic icon) when voiceNoteId present
- [ ] Edit and delete via buttons in expanded state
- [ ] Pagination with "Load earlier sessions"
- [ ] Follows Stitch design

## Files touched
- `backend/LangTeach.Api/DTOs/SessionLogDtos.cs`
- `backend/LangTeach.Api/Services/SessionLogService.cs`
- `backend/LangTeach.Api.Tests/Services/SessionLogServiceTests.cs`
- `frontend/src/api/sessionLogs.ts`
- `frontend/src/components/session/SessionHistoryTab.tsx`
- `frontend/src/components/session/SessionHistoryTab.test.tsx`
- `e2e/tests/students.spec.ts`
