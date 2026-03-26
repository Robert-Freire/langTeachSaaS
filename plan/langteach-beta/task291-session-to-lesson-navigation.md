# Task 291: Course view – session-to-lesson navigation and lesson generation entry point

## Issue
#291 — https://github.com/Robert-Freire/langTeachSaaS/issues/291

## Goal
Each session card in CourseDetail shows a status badge and a primary action:
- Planned (no lesson) → "Not generated" badge + "Generate lesson" button → navigate to LessonNew pre-filled
- Created (lesson exists, draft) → "Draft" badge + "Edit lesson" link → `/lessons/{lessonId}`
- Taught (lesson done) → "Ready" badge + "View lesson" link → `/lessons/{lessonId}`

"Generate lesson" navigates to LessonNew with session metadata (student, language, level, topic, grammar) pre-filled.
When the lesson is created, the course entry is linked to it (backend) so the badge updates on next visit.

## Current State
- `CourseDetail.tsx` has STATUS_LABELS: `{planned: 'Planned', created: 'Created', taught: 'Taught'}`
- Generate lesson button calls `generateLessonFromEntry` API (AI generation server-side) then navigates to lesson editor
- `LessonNew.tsx` already reads `studentId` and `scheduledAt` from search params; no linking back to course entry
- `CurriculumEntry` has `lessonId: string | null` and `status: EntryStatus`

## Files to Change

### Frontend
1. `frontend/src/pages/CourseDetail.tsx`
2. `frontend/src/pages/CourseDetail.test.tsx`
3. `frontend/src/pages/LessonNew.tsx`
4. `frontend/src/pages/LessonNew.test.tsx`
5. `frontend/src/api/lessons.ts`
6. `e2e/tests/courses.spec.ts`

### Backend
7. `backend/LangTeach.Api/DTOs/CreateLessonRequest.cs`
8. `backend/LangTeach.Api/Services/LessonService.cs`
9. `backend/LangTeach.Api.Tests/Controllers/LessonsControllerTests.cs` (or new file for this feature)

---

## Implementation Plan

### Step 1 — Backend: Extend CreateLessonRequest to support course entry linking

**`CreateLessonRequest.cs`** — add optional fields:
```csharp
public Guid? CourseId { get; set; }
public Guid? CourseEntryId { get; set; }
```

**`LessonService.CreateAsync`** — after `_db.SaveChangesAsync`, if both `CourseId` and `CourseEntryId` are present:
1. Load the curriculum entry: `_db.CurriculumEntries.FirstOrDefaultAsync(e => e.Id == request.CourseEntryId && e.CourseId == request.CourseId)`
2. Verify the course belongs to the teacher: join via Course.TeacherId == teacherId
3. If found: set `entry.LessonId = lesson.Id`, `entry.Status = "created"`, save changes
4. Log warning if entry not found (don't fail the lesson creation — lesson was already created)

### Step 2 — Frontend: lessons API — pass course linking params

**`frontend/src/api/lessons.ts`** — extend `CreateLessonPayload` (or equivalent interface) to include optional `courseId` and `courseEntryId` fields, pass them in the POST body.

### Step 3 — Frontend: CourseDetail — replace status labels and action buttons

**`frontend/src/pages/CourseDetail.tsx`**:
1. Update `STATUS_LABELS`:
   - `planned` → `'Not generated'`
   - `created` → `'Draft'`
   - `taught` → `'Ready'`
2. Update `STATUS_CLASSES` colors:
   - `planned`: amber/orange tone (was zinc)
   - `created`: blue (unchanged)
   - `taught`: green (unchanged)
3. Remove `doGenerateLesson` mutation, `generatingId` state, `generatingLesson` state
4. Remove `generateLessonFromEntry` import from `../api/courses`
5. Add a `generateLessonUrl` prop to `SortableEntryRow` — a pre-built URL string
6. Remove `generatingId`, `generatingLesson`, `onGenerateLesson` from `SortableEntryRowProps`
7. In `SortableEntryRow` actions area, replace the generate lesson button with:
   - For `planned` (lessonId = null): `<Link to={generateLessonUrl}>` with "Generate lesson" label (BookOpen icon)
   - For `created` (lessonId exists): `<Link to={/lessons/${entry.lessonId}}>` with "Edit lesson" label (Pencil icon)
   - For `taught` (lessonId exists): `<Link to={/lessons/${entry.lessonId}}>` with "View lesson" label (BookOpen icon)
8. In parent `CourseDetail`, build `generateLessonUrl` for each entry:
   ```ts
   function buildGenerateLessonUrl(entry: CurriculumEntry): string {
     const params = new URLSearchParams()
     if (course.studentId) params.set('studentId', course.studentId)
     if (course.language) params.set('language', course.language)
     if (course.targetCefrLevel) params.set('level', course.targetCefrLevel)
     if (entry.topic) params.set('topic', entry.topic)
     if (entry.grammarFocus) params.set('grammar', entry.grammarFocus)
     params.set('courseId', course.id)
     params.set('entryId', entry.id)
     return `/lessons/new?${params.toString()}`
   }
   ```

### Step 4 — Frontend: LessonNew — read additional pre-fill params and auto-advance

**`frontend/src/pages/LessonNew.tsx`**:
1. Read new search params: `language`, `level`, `topic`, `grammar`, `courseId`, `entryId`
2. Initialize state from params:
   ```ts
   const [language, setLanguage] = useState(searchParams.get('language') ?? '')
   const [cefrLevel, setCefrLevel] = useState(searchParams.get('level') ?? '')
   const [topic, setTopic] = useState(searchParams.get('topic') ?? '')
   // title: pre-fill from topic param
   const [title, setTitle] = useState(searchParams.get('topic') ?? '')
   // objectives: grammar hint if grammar param is set
   const grammarParam = searchParams.get('grammar')
   const [objectives, setObjectives] = useState(grammarParam ? `Grammar focus: ${grammarParam}` : '')
   ```
3. **Auto-advance to Step 2** when navigating from a course entry: if `entryId` param is present, start at step 2 with no template (blank lesson):
   ```ts
   const [step, setStep] = useState<1 | 2>(searchParams.get('entryId') ? 2 : 1)
   const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
   ```
   This ensures the pre-filled form is visible on landing without requiring the teacher to click through the template picker. The lesson will be blank (no template sections), which is the right default for a course-generated lesson.
4. Store `courseId` and `entryId` from params (no UI, passed to API):
   ```ts
   const courseId = searchParams.get('courseId') ?? undefined
   const entryId = searchParams.get('entryId') ?? undefined
   ```
   Note: URL param is named `entryId` but the API field is `courseEntryId`.
5. Pass to `createLesson` mutation:
   ```ts
   createLesson({ ..., courseId, courseEntryId: entryId })
   ```
6. **Student dropdown display note**: When `studentId` is pre-filled from params, the dropdown shows blank until the students query resolves (pre-existing behavior for the existing `studentId` param). This is a known UX limitation — not new to this task.

### Step 4b — Frontend: LessonNew back-button behavior

When `entryId` is present and step === 2, the back button (ArrowLeft) calls `setStep(1)`. This is fine — if the teacher wants to pick a different template they can go back to step 1. No change needed to the back-button logic.

### Step 5 — Frontend unit tests

**`CourseDetail.test.tsx`** — add test group "session lesson status badges and links":
1. `planned` entry shows "Not generated" badge
2. `created` entry shows "Draft" badge
3. `taught` entry shows "Ready" badge
4. `planned` entry "Generate lesson" link href contains `topic`, `grammar`, `courseId`, `entryId` params
5. `created` entry shows link to `/lessons/lesson-id-created`
6. `taught` entry shows link to `/lessons/lesson-id-taught`

Update `mockCourse` entries to include `lessonId` for created/taught entries:
```ts
{ id: 'e2', ..., lessonId: 'lesson-id-created', status: 'created' }
{ id: 'e3', ..., lessonId: 'lesson-id-taught', status: 'taught' }
```

Also remove `generateLessonFromEntry` from the `vi.mock('../api/courses', ...)` call in the test file, since that function is no longer called by the component after Step 3.

**`LessonNew.test.tsx`** — add test group "pre-fill from course params":
1. `language`, `level`, `topic` params pre-fill the respective fields
2. `grammar` param pre-fills objectives with "Grammar focus: ..."
3. `topic` param also pre-fills title

### Step 6 — E2E test

**`e2e/tests/courses.spec.ts`** — add test "Generate lesson from session navigates to LessonNew pre-filled":
1. Update MOCK_COURSE to include `studentId: 'student-uuid'` and `studentName: 'Ana'`
2. Navigate to course detail
3. Assert "Not generated" badge on session 0 (planned)
4. Assert the "Generate lesson" link `href` contains `level=B2`, `studentId=student-uuid`, and `topic=Greetings+and+Introductions` — check the `href` attribute directly without clicking, since checking the href avoids needing to fully load LessonNew
5. Also add a click test: click "Generate lesson", assert page URL contains `level=B2` and `studentId=`, and assert LessonNew step 2 form heading ("Lesson Details") is visible
6. For the click test, the e2e mock must handle `GET /api/lesson-templates` (LessonNew fires it on mount) — add a mock route returning `[]` or a minimal template list

---

## Test Data Notes

For backend test: create new file `LessonsControllerCourseEntryLinkingTests.cs` (separate from existing controller tests for clarity). Tests:
1. `POST /api/lessons` with valid `CourseId` + `CourseEntryId` → entry status set to `created`, entry `LessonId` set
2. `POST /api/lessons` with invalid `CourseEntryId` → lesson still created, no error (graceful fallback)
3. `POST /api/lessons` without linking params → existing behavior unchanged

---

## Test Data Notes

For the e2e test, the MOCK_COURSE needs a `studentId` and a student mock. Update the mock fixture to include `studentId` and `studentName` so the test can verify those params appear in the URL.

For backend test: add test to `LessonsControllerTests` (or create a new file `LessonsControllerCourseEntryLinkingTests.cs`) that:
1. Creates a lesson with `CourseId` + `CourseEntryId` params
2. Verifies the curriculum entry's `LessonId` is set and status is `'created'`

---

## Decisions

- We keep `generateLessonFromEntry` backend endpoint intact (it's a valid API, other callers may use it). We just stop calling it from the frontend button.
- "Generate lesson" now navigates to LessonNew instead of calling AI generation directly. The teacher has full control over lesson configuration before AI generation.
- The `Mark as taught` button for `created` entries stays unchanged — it still calls `markEntryAsTaught`.
- Grammar is passed to LessonNew objectives as a hint; it doesn't become a dedicated form field (avoids scope creep in LessonNew).
- Status update "without full page reload" = React Query cache invalidation on next CourseDetail visit (SPA navigation, no browser reload). The course query has `refetchOnWindowFocus: true` by default in React Query.
