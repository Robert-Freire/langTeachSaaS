# Task 15 — Lesson Editor AI Integration

**Branch:** `task/t15-lesson-editor-ai`
**Effort:** 2 days
**Priority:** Must

---

## Goal

Wire the existing streaming SSE infrastructure (T14) and content-block DB schema (T13) into the lesson editor UI. Teachers can generate content per section, see it stream in a preview panel, insert it, edit it inline, and regenerate it. Everything persists across refresh.

---

## Current State (after T13/T14)

- `LessonContentBlock` entity: `Id, LessonId, LessonSectionId (nullable), BlockType, GeneratedContent, EditedContent, GenerationParams, CreatedAt, UpdatedAt`
- `AddLessonContentBlocks` migration already applied
- `POST /api/generate/{taskType}` — non-streaming, saves block, returns `GenerationResultDto(id, blockType, generatedContent)`. Currently saves `LessonSectionId = null`.
- `POST /api/generate/{taskType}/stream` — streaming SSE, does NOT save to DB
- `useGenerate` hook: `{ status, output, error, generate, abort }`
- `LessonEditor.tsx` — section panels with notes textareas only; no AI UI. Tracks section notes by `SectionType` key. `lesson.sections[]` contains full section objects with `id: string`.

---

## What Needs to Be Built

### Backend

#### 1. New DTOs

**`SaveContentBlockRequest`** (in `LangTeach.Api/DTOs/`):
```csharp
LessonSectionId: Guid?
BlockType: string        // required, MinLength(1)
GeneratedContent: string // required, MinLength(1)
GenerationParams: string? // JSON-serialized GenerateRequest, optional
```

**`ContentBlockDto`** (in `LangTeach.Api/DTOs/`):
```csharp
Id: Guid
LessonSectionId: Guid?
BlockType: string
GeneratedContent: string
EditedContent: string?
IsEdited: bool           // computed: EditedContent != null — NOT a stored column, no migration needed
GenerationParams: string?
CreatedAt: DateTime
```

Note: `NotEmptyGuid` custom validation attribute already exists in `LangTeach.Api/DTOs/` — reuse for any required Guid fields.

#### 2. New controller: `LessonContentBlocksController`

Route prefix: `api/lessons/{lessonId}/content-blocks`

All actions must verify the lesson exists and belongs to the calling teacher (same ownership check pattern as other controllers).

##### 2a. `POST /api/lessons/{lessonId}/content-blocks`
Saves a content block after client-side streaming is complete.

- **Auth:** lesson must belong to calling teacher
- **Request:** `SaveContentBlockRequest`
- **Response:** 201 `ContentBlockDto`

##### 2b. `GET /api/lessons/{lessonId}/content-blocks`
Returns all content blocks for a lesson.

- **Response:** 200 `ContentBlockDto[]` (ordered by `CreatedAt` ascending)
- Returns 200 empty array (not 404) if no blocks exist

##### 2c. `PUT /api/lessons/{lessonId}/content-blocks/{blockId}/edited-content`
Saves teacher's inline edits.

- **Request:** `{ EditedContent: string }`
- **Response:** 200 `ContentBlockDto` (updated, `IsEdited: true`)

##### 2d. `DELETE /api/lessons/{lessonId}/content-blocks/{blockId}`
Hard-deletes a content block (discard).

- **Response:** 204 No Content

##### 2e. `DELETE /api/lessons/{lessonId}/content-blocks/{blockId}/edited-content`
Clears only `EditedContent` (set to null), preserving `GeneratedContent`. Used for "Reset to original".

- **Response:** 200 `ContentBlockDto` with `EditedContent: null, IsEdited: false`

#### 3. Integration tests (`LessonContentBlocksControllerTests.cs`)

Tests must seed: a Teacher, a Lesson, and a LessonSection. Use `scope.ServiceProvider.GetRequiredService<AppDbContext>()` direct insert (same pattern as other controller tests).

Cases:
- `POST` creates block with correct fields, returns 201
- `POST` with `LessonSectionId` of a seeded section — block links correctly
- `GET` returns all blocks for lesson in `CreatedAt` order
- `GET` with wrong teacher's lesson returns 404
- `PUT edited-content` updates `EditedContent`, sets `IsEdited: true`
- `PUT edited-content` on wrong teacher's lesson returns 404
- `DELETE` returns 204, block absent on subsequent GET
- `DELETE /edited-content` clears `EditedContent`, `GeneratedContent` unchanged

---

### Frontend

#### 1. New types and API functions in `src/api/generate.ts`

Add alongside existing `GenerateRequest` and `GenerateStatus`:

```ts
export interface ContentBlockDto {
  id: string
  lessonSectionId: string | null
  blockType: string
  generatedContent: string
  editedContent: string | null
  isEdited: boolean
  generationParams: string | null
  createdAt: string
}

export interface SaveContentBlockRequest {
  lessonSectionId: string | null
  blockType: string
  generatedContent: string
  generationParams: string | null
}
```

API functions (use `apiClient` from `../lib/apiClient`):
```ts
export function getContentBlocks(lessonId: string): Promise<ContentBlockDto[]>
export function saveContentBlock(lessonId: string, req: SaveContentBlockRequest): Promise<ContentBlockDto>
export function updateEditedContent(lessonId: string, blockId: string, content: string): Promise<ContentBlockDto>
export function deleteContentBlock(lessonId: string, blockId: string): Promise<void>
export function resetEditedContent(lessonId: string, blockId: string): Promise<ContentBlockDto>
```

#### 2. `GeneratePanel` component (`src/components/lesson/GeneratePanel.tsx`)

Inline panel (not a modal) that appears below the section header when "Generate" is clicked.

Props:
```ts
{
  lessonId: string
  sectionId: string            // resolved from lesson.sections.find(s => s.sectionType === type)?.id
  sectionType: SectionType     // import from ../api/lessons
  lessonContext: {
    language: string
    cefrLevel: string
    topic: string
    studentId?: string
    existingNotes?: string
  }
  onInsert: (block: ContentBlockDto) => void
  onClose: () => void
}
```

Default task type per section:
```text
WarmUp       -> conversation
Presentation -> vocabulary
Practice     -> exercises
Production   -> grammar
WrapUp       -> conversation
```

UI flow:
- Task type selector (Vocabulary / Grammar / Exercises / Conversation / Reading)
- Style override text field (default: `"Conversational"`)
- "Generate" button: calls `useGenerate().generate(taskType, request)`, where `request` is a `GenerateRequest` built from `lessonContext`
- Streaming preview `<textarea>` (read-only while streaming), shows accumulated `output` from hook
- "Cancel" link: calls `abort()`, resets to idle
- When `status === 'done'`: "Insert into section" + "Discard" buttons
  - "Insert": calls `saveContentBlock(lessonId, { lessonSectionId: sectionId, blockType, generatedContent: output, generationParams: JSON.stringify(request) })`, then `onInsert(savedBlock)`, then `onClose()`
  - "Discard": calls `onClose()`
- When `status === 'error'`: show error message + "Retry" button

#### 3. `ContentBlock` component (`src/components/lesson/ContentBlock.tsx`)

Displays a persisted content block inside a section.

Props:
```ts
{
  block: ContentBlockDto
  lessonId: string
  onUpdate: (updated: ContentBlockDto) => void
  onDelete: (id: string) => void
}
```

Features:
- `<textarea>` renders `block.editedContent ?? block.generatedContent`
- "AI-generated" badge (gray pill, always visible)
- "Modified" indicator (shown only when `block.isEdited`)
- **Save on blur** (no debounce): `onBlur` calls `updateEditedContent(lessonId, block.id, value)` if value differs from current stored content; calls `onUpdate` with result
- "Regenerate" button: closes this block's view, re-opens `GeneratePanel` with the original `generationParams` deserialized (no `force` flag — just re-run with same params)
- "Reset to original" button (shown only when `block.isEdited`): calls `resetEditedContent(lessonId, block.id)`, then `onUpdate` with result
- "Discard" (X) button: calls `deleteContentBlock(lessonId, block.id)`, then `onDelete(block.id)`

#### 4. Update `LessonEditor.tsx`

**Section ID resolution:** `lesson.sections` always contains all 5 section rows after the first save. Resolve section ID before passing to `GeneratePanel`:
```ts
const sectionId = lesson.sections.find(s => s.sectionType === type)?.id ?? null
```
If `sectionId` is null (section not yet saved — edge case on brand-new lessons), show a toast or disable the Generate button with a "Save lesson first" tooltip.

**State additions:**
```ts
const [contentBlocks, setContentBlocks] = useState<Record<string, ContentBlockDto[]>>({})
// keyed by sectionId; blocks with null sectionId are ignored in the UI
const [generateOpen, setGenerateOpen] = useState<SectionType | null>(null)
```

**On mount** (after lesson loads): call `getContentBlocks(lessonId)`, group by `lessonSectionId`, set into `contentBlocks` state.

**Section panel additions per section:**
- "Generate" button top-right of section `CardHeader` — `onClick: () => setGenerateOpen(type)`
- Below notes textarea: render `contentBlocks[sectionId]?.map(b => <ContentBlock ... />)`
- Below textarea (when `generateOpen === type`): render `<GeneratePanel ... onInsert={handleInsert} onClose={() => setGenerateOpen(null)} />`

**Handlers:**
```ts
handleInsert(block): append block to contentBlocks[block.lessonSectionId], close panel
handleBlockUpdate(updated): replace block in state by id
handleBlockDelete(id): filter out block from state
```

---

## DB Migration

No new tables needed. The `LessonContentBlocks` table already exists with all required columns. No migration required for T15.

---

## Playwright E2E Test

File: `e2e/lesson-ai-generate.spec.ts`

**Happy path:**
1. Login as teacher
2. Create a lesson (uses existing lesson creation helpers from other specs)
3. Link a student to the lesson
4. Open lesson editor
5. Click "Generate" button on the Presentation section
6. Select "Vocabulary" task type, click "Generate"
7. `await page.getByRole('button', { name: 'Insert into section' }).waitFor({ state: 'visible', timeout: 30000 })` — waits for streaming to complete
8. Click "Insert into section"
9. Assert `[data-testid="ai-block-badge"]` (or "AI-generated" text) is visible in section
10. `await page.reload()`
11. Assert the content block is still visible after reload (persisted)

---

## Out of Scope for T15

- Modifying `GenerateRequest` — `SectionId` is NOT added to `GenerateRequest` in T15 (the save endpoint handles section linkage independently)
- Multi-block per section (architecturally supported, UI shows all blocks stacked)
- Full lesson generation (T16)
- Regenerate-with-direction modifiers (T21)

---

## Done When

Teacher can generate content per section, see it stream, insert, edit inline, reset to original, and regenerate. All persists across refresh. E2E test passes.
