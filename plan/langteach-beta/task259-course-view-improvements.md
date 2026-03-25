# Task 259 - Course view improvements: add/remove sessions, drag reorder, summary header

## Issue
[#259](https://github.com/Robert-Freire/langTeachSaaS/issues/259)

## Acceptance Criteria
- [ ] Teacher can add a new session at any position in the curriculum
- [ ] Teacher can remove a session (with confirmation dialog)
- [ ] Drag-to-reorder works smoothly for curriculum entries
- [ ] Reorder changes persist to the backend
- [ ] Curriculum summary header shows: total sessions, CEFR target, student name, mode, completion progress
- [ ] Unit test: add/remove entry API endpoints
- [ ] Unit test: batch reorder endpoint
- [ ] Unit test: drag-to-reorder component interaction

## Current State

**Backend** (`CoursesController.cs`):
- `PUT /api/courses/{id}/curriculum/reorder` — batch reorder, already exists
- `PUT /api/courses/{id}/curriculum/{entryId}` — update entry, exists
- **Missing**: POST add entry, DELETE remove entry

**Frontend** (`CourseDetail.tsx`):
- Up/down buttons for reorder (UI only, calls existing reorder endpoint)
- Edit form per entry
- Progress bar + PageHeader subtitle already shows CEFR/mode/student
- **Missing**: drag-and-drop, add session form, remove session, structured summary header

## Implementation Plan

### 1. Backend — Add entry endpoint

New action in `CoursesController.cs`:

```
POST /api/courses/{id}/curriculum
Body: { topic, grammarFocus?, competencies?, lessonType?, insertAfterIndex? }
```

- Loads all entries for course, shifts orderIndex of entries where `orderIndex > insertAfterIndex` by +1
- Creates new entry with `OrderIndex = insertAfterIndex + 1` (defaults to end if not provided)
- Returns 201 with the new `CurriculumEntryDto`
- New DTO: `AddCurriculumEntryRequest`

### 2. Backend — Remove entry endpoint

```
DELETE /api/courses/{id}/curriculum/{entryId}
```

- Soft-delete: set `IsDeleted = true` on `CurriculumEntry` (need to add `IsDeleted` column via migration)
- After soft-delete, reindex remaining (non-deleted) entries so orderIndex values stay contiguous (1, 2, 3...)
- Update `course.UpdatedAt`
- Returns 204

**Migration**: add `IsDeleted bool default false` to `CurriculumEntries` table.

**All places that must filter `!e.IsDeleted` after migration:**
- `Reorder` endpoint: build `entryMap` from `course.Entries.Where(e => !e.IsDeleted)` — without this, the `Count != entryMap.Count` guard will reject valid reorder payloads because deleted entries inflate the expected count
- `MapToDto`: `c.Entries.Where(e => !e.IsDeleted).OrderBy(e => e.OrderIndex).Select(MapEntryToDto)` — otherwise deleted entries appear in the GET course response
- `MapToSummary`: `LessonsCreated` count already uses `c.Entries.Count(...)` — add `!e.IsDeleted` filter there too
- The `GetById` and `List` actions load entries via `.Include(c => c.Entries)` — EF Core does not auto-filter here, so the filtering must happen in `MapToDto`/`MapToSummary` (preferred) rather than in a global query filter (to keep the migration simple)

### 3. Frontend — Install @dnd-kit

```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 4. Frontend — Drag-to-reorder

Replace the up/down buttons with `@dnd-kit/sortable`:
- Wrap `curriculum-list` div in `<DndContext onDragEnd={handleDragEnd}>` + `<SortableContext items={entryIds}>`
- Each entry row becomes a `<SortableItem>` with a drag handle (GripVertical icon)
- `handleDragEnd`: on `active.id !== over.id`, compute new order via `arrayMove`, call `doReorder`
- Keep `data-testid="curriculum-entry-{idx}"` on each item for test stability

### 5. Frontend — Add session

Single clear UX: a "+ Add session" button at the bottom of the curriculum list. On click, an inline form appends at the end (no position selector — keep it simple):
- Topic (required), Grammar focus (optional), Competencies (optional, comma-separated)
- Save / Cancel buttons
- On save: calls `addCurriculumEntry(courseId, { topic, grammarFocus, competencies })` (no `insertAfterIndex` — server appends at end)
- On success: `queryClient.invalidateQueries(['course', id])`

*Rationale*: inserting at an arbitrary position is achievable via drag-after-add, keeping the add form simple.

### 6. Frontend — Remove session

- Add a trash icon button to each entry row's action bar
- On click: show a confirmation `AlertDialog` (shadcn/ui)
- On confirm: call `deleteCurriculumEntry(courseId, entryId)`, invalidate query

### 7. Frontend — Summary header

Replace the current plain progress bar + PageHeader subtitle with a structured card:
- A `CourseSummaryHeader` component rendered between `PageHeader` and the curriculum list
- Shows: total sessions, CEFR level (or exam target), student name, mode, progress (X of Y lessons created)
- Uses existing course fields — no new API data needed
- Style: a horizontal info strip (small stat chips) consistent with design system

### 8. Frontend API additions

In `courses.ts`:
```ts
export async function addCurriculumEntry(courseId, req): Promise<CurriculumEntry>
export async function deleteCurriculumEntry(courseId, entryId): Promise<void>
```

### 9. Tests

**Backend** (`CoursesControllerTests.cs` or new file `CoursesControllerEntryTests.cs`):
- `POST curriculum` — creates entry, shifts orderIndex of subsequent entries
- `POST curriculum` at end — appends with correct orderIndex
- `DELETE curriculum/{entryId}` — soft-deletes, reindexes remaining entries
- `DELETE curriculum/{entryId}` non-existent — returns 404
- Existing reorder test already covers `PUT curriculum/reorder`

**Frontend** (`CourseDetail.test.tsx`):
- **Extend the `vi.mock` factory** to include `addCurriculumEntry` and `deleteCurriculumEntry` (otherwise new tests throw "not a function")
- Add session: clicking "+ Add session", filling form, submitting calls `addCurriculumEntry`
- Remove session: clicking trash icon, confirming dialog calls `deleteCurriculumEntry`
- Drag reorder: mock `@dnd-kit` and simulate `onDragEnd` callback directly; verify `reorderCurriculum` called with correct order
- Summary header: verify stat chips render with correct values from mock course

**E2E** (new `e2e/courses/course-detail.spec.ts`):
- Load course detail page, drag first entry to second position, verify order in DOM after drop
- Click "+ Add session", fill topic, save — verify new entry appears in list
- Click remove on first entry, confirm — verify entry removed from list
- Verify summary header shows correct session count, CEFR level, student name, mode

## Files to change

**Backend:**
- `LangTeach.Api/DTOs/CourseDto.cs` — add `AddCurriculumEntryRequest`
- `LangTeach.Api/Data/Models/CurriculumEntry.cs` — add `IsDeleted` property
- `LangTeach.Api/Controllers/CoursesController.cs` — add AddEntry + DeleteEntry actions; filter `!e.IsDeleted` in queries
- New migration for `IsDeleted` on `CurriculumEntries`
- `LangTeach.Api.Tests/Controllers/CoursesControllerEntryTests.cs` — new test file

**Frontend:**
- `frontend/package.json` — add @dnd-kit dependencies
- `frontend/src/api/courses.ts` — add `addCurriculumEntry`, `deleteCurriculumEntry`
- `frontend/src/pages/CourseDetail.tsx` — drag-and-drop, add/remove session, replace progress bar with summary header
- `frontend/src/pages/CourseDetail.test.tsx` — extend with new tests

## Risks / Notes

- `@dnd-kit` testing: simulating drag-and-drop with RTL is tricky. Will use a `mockDndKit` approach that calls `onDragEnd` directly.
- Soft-delete on entries: the existing `MapToDto` + all queries already filter `!c.IsDeleted` on Course. Need to extend to also filter entries in the `Include` / queries. The `Reorder` endpoint validates entry count — must exclude deleted entries.
- The `SessionCount` on the Course record is an intended/planned count set at creation. After removing entries, it won't match actual entry count — this is intentional (teacher planned N sessions, they can remove some). Progress shows "created" vs sessionCount.
