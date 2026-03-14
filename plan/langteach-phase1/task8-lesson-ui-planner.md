# T8 — Lesson UI (Planner)

> **Branch:** `task/t8-lesson-ui-planner` (based on `task/t7-lesson-crud-api`)
> **Depends on:** T7 API (all lesson endpoints already built)
> **Rebase note:** T7 is still in review. After T7 merges to `main`, rebase this branch onto `main`.

---

## Scope

Build the full frontend for lesson management: list, creation wizard, and per-lesson editor. Wire dashboard tiles. Ship Playwright tests.

---

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/api/lessons.ts` | API client for all lesson endpoints |
| `frontend/src/pages/Lessons.tsx` | `/lessons` list view |
| `frontend/src/pages/LessonNew.tsx` | `/lessons/new` two-step creation wizard |
| `frontend/src/pages/LessonEditor.tsx` | `/lessons/:id` editor with auto-save sections |
| `e2e/tests/lessons.spec.ts` | Playwright e2e test |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Add 3 new routes |
| `frontend/src/pages/Dashboard.tsx` | Wire "Lessons this week" and "Active plans" tiles to `/lessons` |
| `e2e/tests/dashboard.spec.ts` | Assert both tiles navigate to `/lessons` |

---

## Step-by-Step Implementation Plan

### Step 1 — API client (`frontend/src/api/lessons.ts`)

Model types matching the backend DTOs:
```ts
type LessonStatus = 'Draft' | 'Published'
type SectionType = 'WarmUp' | 'Presentation' | 'Practice' | 'Production' | 'WrapUp'

interface LessonSection { id: string; sectionType: SectionType; orderIndex: number; notes: string | null }
interface Lesson { id: string; title: string; language: string; cefrLevel: string; topic: string;
  durationMinutes: number; objectives: string | null; status: LessonStatus;
  studentId: string | null; templateId: string | null; sections: LessonSection[];
  createdAt: string; updatedAt: string }
interface LessonListItem extends Omit<Lesson, 'sections'> {}  // list endpoint omits sections
```

Functions:
- `getLessons(query)` — GET `/api/lessons` with search/filter params, returns `PagedResult<Lesson>`
- `getLesson(id)` — GET `/api/lessons/:id`
- `createLesson(req)` — POST `/api/lessons`
- `updateLesson(id, req)` — PUT `/api/lessons/:id`
- `updateSections(id, sections)` — PUT `/api/lessons/:id/sections`
- `deleteLesson(id)` — DELETE `/api/lessons/:id`
- `duplicateLesson(id)` — POST `/api/lessons/:id/duplicate`

Also need `getTemplates()` — GET `/api/lesson-templates` (check if this endpoint exists in T7; if not, hardcode the 5 known templates client-side with their IDs from seed data, querying the API once on mount).

**Note:** Check if T7 added a `/api/lesson-templates` endpoint. If not, we will hardcode the 5 template names (Conversation, Grammar Focus, Reading & Comprehension, Writing Skills, Exam Prep) and pass `templateId: null` with a `blank` option — the sections will just be empty. We still need to resolve template GUIDs. Plan: fetch a lesson created from each template type in integration tests — or better, add a `GET /api/lesson-templates` endpoint in T7/T8 backend work (minimal: id + name).

**Decision point:** If there is no templates endpoint, add it as a minimal backend addition in this task (single controller method, no service changes — just read from `LessonTemplates` table).

---

### Step 2 — Routes in `App.tsx`

```tsx
<Route path="/lessons" element={<Lessons />} />
<Route path="/lessons/new" element={<LessonNew />} />
<Route path="/lessons/:id" element={<LessonEditor />} />
```

---

### Step 3 — List view (`Lessons.tsx`)

Layout mirrors `Students.tsx` pattern:
- Page header with title + "New Lesson" button (`<Link to="/lessons/new">`)
- Search input (debounced 400ms via `useState` + `useEffect`, passed to `getLessons`)
- Three filter dropdowns (language, CEFR level, status) using shadcn `Select`
- Card list: title, language badge, CEFR badge, status badge (Draft=zinc, Published=green), topic, last updated
- Edit icon links to `/lessons/:id`; trash icon opens delete `AlertDialog`
- Empty state (BookOpen icon, "No lessons yet", CTA button)
- Loading/error states matching Students pattern

Query key: `['lessons', { search, language, cefrLevel, status }]` — invalidated on delete/duplicate.

---

### Step 4 — Creation wizard (`LessonNew.tsx`)

Two-step flow, local state tracks `step: 1 | 2` and `selectedTemplateId: string | null`.

**Step 1 — Template picker:**
- 6 cards in a grid: Conversation, Grammar Focus, Reading & Comprehension, Writing Skills, Exam Prep, Blank
- Each card: icon (use appropriate Lucide icon), name, brief description
- Selected card gets an indigo ring; clicking advances to step 2
- "Blank" sets `templateId = null`

**Step 2 — Metadata form:**
- Title (required, text input)
- Language (required, Select: English, Spanish, French, German, Italian, Portuguese, Mandarin, Japanese, Arabic, Other)
- CEFR Level (required, Select: A1, A2, B1, B2, C1, C2)
- Topic (required, text input)
- Duration (required, Select: 30 / 45 / 60 / 90 min — simpler than a slider for V1)
- Objectives (optional, textarea)
- Student (optional, Select populated via `getStudents()`)
- Back button to step 1; Submit calls `createLesson()` then navigates to `/lessons/:newId`
- Submission error banner if API call fails

---

### Step 5 — Lesson editor (`LessonEditor.tsx`)

Fetch lesson on mount via `useQuery(['lesson', id], () => getLesson(id))`.

**Top bar:**
- Inline editable title: click to edit (controlled input), blur triggers `updateLesson` if changed
- Status toggle button: "Draft" / "Published" — clicking toggles and calls `updateLesson`
- "Duplicate" button: calls `duplicateLesson`, navigates to new lesson on success
- "Delete" button: opens AlertDialog, on confirm calls `deleteLesson`, navigates to `/lessons`

**Metadata strip (collapsible):**
- Shows language, level, topic, duration, objectives read-only (or small edit form — keep simple for V1: read-only display, user can re-open via "Edit details" that expands a form)
- Actually: make it an always-visible collapsed summary bar with an "Edit" pencil icon that opens an inline form. On save calls `updateLesson`.

**Section panels (5 fixed sections in order):**
- WarmUp, Presentation, Practice, Production, WrapUp
- Each panel: section type label (formatted: "Warm Up", "Wrap Up", etc.) + textarea for notes
- Auto-save on blur: on textarea blur, if value changed, call `updateSections` with all 5 sections
- "Saved" indicator: small text appears briefly after successful save ("Saved" fades out after 2s)
- Loading state: show spinner during save

**Section data flow:**
- Local state holds all 5 section notes as `{ [sectionType]: string }`
- Initialized from fetched lesson sections
- On blur of any textarea, PUT `/api/lessons/:id/sections` with full sections array
- `updateSections` payload: `{ sections: [{ sectionType, orderIndex, notes }] }`

**Link Student button:**
- Shown if `lesson.studentId === null`
- Opens a small dialog with a student Select dropdown, confirm calls `updateLesson({ studentId })`

---

### Step 6 — Dashboard tile wiring (`Dashboard.tsx`)

Wrap the "Lessons this week" tile and "Active plans" tile in `<Link to="/lessons">` using `buttonVariants` pattern (same as was done for Students tile in T6).

---

### Step 7 — Playwright test (`e2e/tests/lessons.spec.ts`)

Happy path:
1. Login via `auth-helper`
2. Navigate to `/lessons`, assert empty state (first run) or list renders
3. Click "New Lesson", pick "Grammar Focus" template
4. Fill: title="Test Grammar Lesson", language="English", level="B1", topic="Present Perfect", duration="45"
5. Submit, assert redirected to `/lessons/:id`
6. Edit the "Presentation" section textarea, blur
7. Assert "Saved" indicator appears
8. Reload page, assert Presentation notes persisted
9. Click "Duplicate", assert navigated to new lesson (different ID), new lesson title starts with "Copy of"
10. Navigate back to `/lessons`, assert 2 lessons visible

Also extend `e2e/tests/dashboard.spec.ts`:
- Assert "Lessons" tile has an `href` containing `/lessons` and clicking it navigates to `/lessons`

---

### Step 8 — Templates endpoint (if missing)

Check if `GET /api/lesson-templates` exists. If not, add it:
- New `LessonTemplatesController` (read-only, no auth required or just `[Authorize]`)
- Single `GET /api/lesson-templates` returning `List<LessonTemplateDto>` (id, name, description)
- No service layer needed — direct DbContext query
- No new tests needed for this minimal addition (T7 integration tests already cover template seeding)

---

## Patterns / Constraints

- All API calls go through `apiClient` (Axios instance with auth interceptor)
- TanStack Query for all server state; no raw `useEffect` for fetching
- `logger.ts` called at: lesson created, section saved, status changed, duplicate triggered
- Row-level security is enforced on the backend; frontend just handles 403/404 gracefully
- Shadcn components only: Button, Input, Textarea, Select, Badge, Card, AlertDialog
- `buttonVariants` on `<Link>` for link-buttons (no `asChild`)
- Match loading/error/empty state patterns from `Students.tsx`

---

## Pre-push Checklist

- [ ] `dotnet build` — zero warnings/errors (only if templates endpoint added)
- [ ] `dotnet test` — all pass
- [ ] `npm run build` — zero errors
- [ ] `npx playwright test` from `e2e/` — all tests pass (requires running stack)

---

## Rebase Plan

After T7 PR merges to `main`:
```bash
git fetch origin
git rebase origin/main
# resolve any conflicts (unlikely — T8 is pure frontend + optional small backend addition)
git push --force-with-lease
```
