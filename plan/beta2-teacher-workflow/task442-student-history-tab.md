# Task 442 — Student History Tab: Session Timeline List

**Issue:** #442  
**Sprint branch:** sprint/post-class-tracking  
**Dependencies:** #440 (merged), #450 (in progress — delete endpoint + topic tags)

---

## Objective

Add a "History" tab to the student detail page showing a scrollable session timeline. Expand/collapse per entry. Delete action (soft delete from #450 API).

---

## Implementation Plan

### Files to create
- `frontend/src/components/ui/tabs.tsx` — Simple state-driven tabs (no new package)
- `frontend/src/components/session/SessionHistoryTab.tsx` — Timeline list component
- `frontend/src/components/session/SessionHistoryTab.test.tsx` — Unit tests

### Files to modify
- `frontend/src/api/sessionLogs.ts` — Add `deleteSession` function
- `frontend/src/pages/StudentDetail.tsx` — Restructure with tabs (Overview / History)
- `frontend/src/pages/StudentDetail.test.tsx` — Add History tab tests

### Tab structure
StudentDetail gets two tabs:
- **Overview** — existing: StudentProfileSummary + LessonHistoryCard + StudentCoursesCard
- **History** — new: SessionHistoryTab

### Session entry inline preview
- Date + relative time ("3 days ago")
- Planned content (1 line truncated)
- Actual content (1 line truncated)
- Homework assigned (if any)
- Previous homework status badge
- Notes count (generalNotes + nextSessionTopics if set)

### Expanded detail
- Full planned/actual/notes/next-topics
- Topic tags as category-colored chips
- Linked lesson link (if set)
- Level reassessment (if set)

### Topic tag category colors
- grammar: indigo
- vocabulary: green
- competency: amber
- communicativeFunction: purple
- (none/other): zinc

### Delete
- Soft delete via `DELETE /api/students/{studentId}/sessions/{sessionId}` (#450)
- AlertDialog confirmation before delete
- Optimistic invalidate of ['sessions', studentId] on success

### Relative time
- < 7 days: "N days ago" (or "today", "yesterday")
- 7-30 days: "N weeks ago"
- > 30 days: "N months ago"

### Acceptance criteria coverage
All ACs from issue #442 are covered. Delete is implemented against the #450 endpoint
(will work once #450 merges; button exists in UI now).
