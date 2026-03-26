# Task 166 — Display Learning Target Labels on Generated Activities

## Issue
#166: Display learning target labels on generated activities

## Context

`CurriculumEntry` already has a 1:1 link to `Lesson` via `CurriculumEntry.LessonId`. A lesson corresponds to exactly one curriculum session, so all content blocks in a lesson practice the same curriculum targets. Learning targets are stored at **lesson level** (not per-block), which avoids redundancy while still satisfying the AC of showing labels "next to each content block".

## Architecture Decision

**Store `LearningTargets` on `Lesson` (not on `LessonContentBlock`).**

Rationale:
- All blocks in a lesson session practice the same curriculum targets (the lesson IS linked to one CurriculumEntry)
- Avoids storing redundant data on every block
- Teacher edits once at lesson level; all blocks reflect the change
- Per-block storage would add a migration + per-block API calls for no semantic benefit

Display: each `ContentBlock` receives `learningTargets: string[]` as a prop from `LessonEditor`. Tags shown read-only in editor header; inline tag editor on `ContentBlock` calls a lesson-level callback.

## Changes

### 1. Backend: Migration + Model

**New migration**: `AddLearningTargetsToLesson`
- `ALTER TABLE Lessons ADD LearningTargets NVARCHAR(MAX) NULL`

**`Lesson.cs`**: Add `public string? LearningTargets { get; set; }` (stored as JSON array string)

### 2. Backend: DTOs + LessonService mapper

**`LessonDto.cs`**: Add `string[]? LearningTargets` as the last parameter to the positional record:
```csharp
public record LessonDto(
    Guid Id, string Title, ..., string? StudentName,
    string[]? LearningTargets   // new — at the end
);
```

**`LessonService.cs`** (`MapToDto`, line 336): Update the positional `new LessonDto(...)` call to add:
```csharp
l.LearningTargets is not null
    ? JsonSerializer.Deserialize<string[]>(l.LearningTargets)
    : null
```
as the last argument. `LessonService.cs` MUST be updated; the mapper is NOT in `LessonsController`.

**`StudyLessonDto.cs`**: Add `string[]? LearningTargets` field to `StudyLessonDto` record.
Update mapping in `LessonsController.Study()` to include `lesson.LearningTargets` deserialized.

### 3. Backend: Auto-derive labels at generation time

In both `GenerateController.Generate()` and `LessonContentBlocksController.Save()`, after loading the lesson, call a shared helper:

```csharp
private static async Task EnsureLearningTargetsAsync(AppDbContext db, Lesson lesson, CancellationToken ct)
{
    if (lesson.LearningTargets is not null) return;
    var entry = await db.CurriculumEntries
        .FirstOrDefaultAsync(e => e.LessonId == lesson.Id && !e.IsDeleted, ct);
    if (entry is null) return;

    var labels = new List<string>();
    if (!string.IsNullOrWhiteSpace(entry.GrammarFocus))
        labels.Add(entry.GrammarFocus.Trim());
    foreach (var c in (entry.Competencies ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries))
    {
        var label = c.Trim();
        if (label.Length > 0)
            labels.Add(char.ToUpper(label[0]) + label[1..]);
    }
    if (labels.Count == 0) return;

    lesson.LearningTargets = JsonSerializer.Serialize(labels);
    lesson.UpdatedAt = DateTime.UtcNow;
    // SaveChangesAsync is called by the caller after this helper returns
}
```

Call this helper:
- In `GenerateController.Generate()`: after lesson load, before building the block. `await EnsureLearningTargetsAsync(_db, lesson, ct);` Then save together with the block.
- In `LessonContentBlocksController.Save()`: same pattern.

**Note**: `AppDbContext.CurriculumEntries` is confirmed as `DbSet<CurriculumEntry>` (line 19 of `AppDbContext.cs`). The helper uses this DbSet name. `LessonContentBlocksController` uses `_db` field (confirmed). `Stream()` in `GenerateController` is intentionally excluded — streaming does not persist the block server-side; the frontend saves it via `LessonContentBlocksController.Save()` which is already a trigger point.

### 4. Backend: New endpoint

Add `UpdateLearningTargetsAsync` to `ILessonService` + `LessonService` (keeps pattern consistent with other lesson operations):

```csharp
// ILessonService
Task<LessonDto?> UpdateLearningTargetsAsync(Guid teacherId, Guid lessonId, string[]? labels, CancellationToken ct);

// LessonService implementation
public async Task<LessonDto?> UpdateLearningTargetsAsync(Guid teacherId, Guid lessonId, string[]? labels, CancellationToken ct)
{
    var lesson = await _db.Lessons.Include(l => l.Sections).ThenInclude(s => s.Materials)
        .Include(l => l.Student)
        .FirstOrDefaultAsync(l => l.Id == lessonId && l.TeacherId == teacherId && !l.IsDeleted, ct);
    if (lesson is null) return null;
    lesson.LearningTargets = labels is { Length: > 0 } ? JsonSerializer.Serialize(labels) : null;
    lesson.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync(ct);
    return MapToDto(lesson);
}
```

In `LessonsController`:
```
PUT /api/lessons/{lessonId:guid}/learning-targets
Body: { "learningTargets": ["label1", "label2"] }
Returns: 200 LessonDto | 404
```

Request DTO: `UpdateLearningTargetsRequest { string[]? LearningTargets { get; set; } }` (null = clear)

Controller delegates to `_lessonService.UpdateLearningTargetsAsync(...)`.

### 5. Frontend: API types + function

**`frontend/src/api/lessons.ts`**:
- Add `learningTargets?: string[] | null` to `Lesson` interface
- Add `learningTargets?: string[] | null` to `StudyLessonDto` interface
- Add function:
  ```ts
  export function updateLearningTargets(lessonId: string, labels: string[]): Promise<Lesson> {
    return apiClient.put<Lesson>(`/api/lessons/${lessonId}/learning-targets`, { learningTargets: labels }).then(r => r.data)
  }
  ```

### 6. Frontend: ContentBlock component

**`ContentBlock.tsx`**:

Add props:
```ts
interface ContentBlockProps {
  // existing props...
  learningTargets?: string[] | null
  onUpdateLearningTargets?: (labels: string[]) => Promise<void>
}
```

Add state:
```ts
const [editingTargets, setEditingTargets] = useState(false)
const [targetsDraft, setTargetsDraft] = useState<string[]>([])
const [newTagInput, setNewTagInput] = useState('')
```

UI in header area (below existing badges, above mode toggle):
```tsx
{/* Learning targets row */}
{((learningTargets && learningTargets.length > 0) || onUpdateLearningTargets) && (
  <div className="flex flex-wrap gap-1 items-center w-full mt-1" data-testid="learning-targets">
    {!editingTargets && learningTargets?.map(label => (
      <Badge key={label} variant="secondary" className="text-xs bg-teal-50 text-teal-700 border-teal-200">
        {label}
      </Badge>
    ))}
    {editingTargets && (
      <>
        {targetsDraft.map((label, i) => (
          <Badge key={i} variant="secondary" className="text-xs bg-teal-50 text-teal-700 border-teal-200 gap-1">
            {label}
            <button onClick={() => setTargetsDraft(prev => prev.filter((_, j) => j !== i))}
              className="hover:text-red-600 ml-0.5" aria-label={`Remove ${label}`}>×</button>
          </Badge>
        ))}
        <input
          value={newTagInput}
          onChange={e => setNewTagInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && newTagInput.trim()) {
              setTargetsDraft(prev => [...prev, newTagInput.trim()])
              setNewTagInput('')
            }
          }}
          placeholder="Add label…"
          className="text-xs border border-zinc-300 rounded px-1 py-0.5 w-28"
        />
        <Button size="sm" variant="ghost" className="h-5 px-1.5 text-xs"
          onClick={async () => {
            try {
              await onUpdateLearningTargets!(targetsDraft)
              setEditingTargets(false)
            } catch {
              setActionError('Failed to save learning targets. Please try again.')
            }
          }}>Save</Button>
        <Button size="sm" variant="ghost" className="h-5 px-1.5 text-xs text-zinc-400"
          onClick={() => setEditingTargets(false)}>Cancel</Button>
      </>
    )}
    {!editingTargets && onUpdateLearningTargets && (
      <Button size="sm" variant="ghost" className="h-5 px-1.5 text-xs text-zinc-400"
        aria-label="Edit learning targets"
        onClick={() => { setTargetsDraft(learningTargets ?? []); setEditingTargets(true) }}>
        Edit targets
      </Button>
    )}
  </div>
)}
```

### 7. Frontend: LessonEditor page

- Pass `learningTargets` to each `ContentBlock`:
  ```tsx
  <ContentBlock
    ...
    learningTargets={lesson.learningTargets ?? null}
    onUpdateLearningTargets={async (labels) => {
      await updateLearningTargets(id!, labels)
      queryClient.invalidateQueries({ queryKey: ['lesson', id] })
    }}
  />
  ```

- Import `updateLearningTargets` from `../../api/lessons`
- Import `useQueryClient` from `@tanstack/react-query` (already imported if used elsewhere; check)

### 8. Frontend: StudyView page

In `StudyView.tsx`, show learning targets on each block as read-only. The study lesson DTO now includes `learningTargets` at the top level (lesson level). Show them once per lesson — either at the top of each section or before the blocks list.

Actually, the study view renders per-block via `StudyBlockDto`. Since learning targets are lesson-level, show them once at the top of the lesson (not per-block) in the study view, to avoid repetition. This is simpler and less noisy.

Update `StudyView.tsx` to show a small "Learning targets" line at the top of the lesson content:
```tsx
{lesson.learningTargets && lesson.learningTargets.length > 0 && (
  <div className="flex flex-wrap gap-1 mb-4" data-testid="study-learning-targets">
    <span className="text-xs text-zinc-400 mr-1">Practices:</span>
    {lesson.learningTargets.map(label => (
      <Badge key={label} variant="secondary" className="text-xs bg-teal-50 text-teal-700">
        {label}
      </Badge>
    ))}
  </div>
)}
```

### 9. Tests

**Backend unit tests** (in `LessonContentBlocksControllerTests.cs` or a new `LessonsControllerLearningTargetsTests.cs`):
- `PUT learning-targets` returns 200 with serialized array
- `PUT learning-targets` with empty array clears labels
- `PUT learning-targets` on foreign lesson returns 404

**Backend unit test for label derivation** (in existing `GenerateControllerTests.cs` or new file):
- When lesson has a linked CurriculumEntry with GrammarFocus + Competencies: labels are derived correctly
- When lesson has no linked CurriculumEntry: no labels set
- When lesson.LearningTargets already set: not overwritten

**Frontend unit tests** (`ContentBlock.test.tsx`):
- Renders learning target badges when `learningTargets` prop is provided
- Does not render targets area when `learningTargets` is null/empty
- Clicking "Edit targets" shows tag editor with existing labels
- Remove "×" on a tag updates draft
- Pressing Enter in input adds a new tag
- Clicking Save calls `onUpdateLearningTargets` with updated labels
- Save failure: keeps edit mode open, shows error message

**Frontend unit tests** (`StudyView.test.tsx`):
- Renders `data-testid="study-learning-targets"` when lesson has learning targets
- Does not render the targets section when `learningTargets` is null/empty

### 10. E2E test

Add a test scenario in the existing e2e suite (or a new `learning-targets.spec.ts`):
- Create a course with a student, curriculum entry with GrammarFocus set
- Navigate to lesson editor for a session linked to that entry
- Generate any content block
- Assert learning target badges appear in the block header
- Click "Edit targets", remove one tag, add a new one, click Save
- Assert updated tags are displayed
- Reload the lesson editor and assert tags persist

## Files to create/modify

**Backend:**
- `Migrations/YYYYMMDD_AddLearningTargetsToLesson.cs` (new)
- `Data/Models/Lesson.cs` (add field)
- `DTOs/LessonDto.cs` (add parameter to positional record)
- `DTOs/StudyLessonDto.cs` (add field)
- `DTOs/UpdateLearningTargetsRequest.cs` (new)
- `Services/ILessonService.cs` (add UpdateLearningTargetsAsync)
- `Services/LessonService.cs` (implement UpdateLearningTargetsAsync + update MapToDto)
- `Controllers/LessonsController.cs` (add PUT endpoint, update Study mapping)
- `Controllers/GenerateController.cs` (add EnsureLearningTargetsAsync call)
- `Controllers/LessonContentBlocksController.cs` (add EnsureLearningTargetsAsync call)
- `LangTeach.Api.Tests/Controllers/LessonsControllerLearningTargetsTests.cs` (new)
- `LangTeach.Api.Tests/Controllers/LessonContentBlocksControllerLearningTargetTests.cs` (new, for derivation trigger)

**Frontend:**
- `src/api/lessons.ts` (add field to Lesson + StudyLessonDto, add updateLearningTargets fn)
- `src/components/lesson/ContentBlock.tsx` (add props + labels UI)
- `src/components/lesson/ContentBlock.test.tsx` (add tests)
- `src/pages/LessonEditor.tsx` (pass props to ContentBlock)
- `src/pages/StudyView.tsx` (show learning targets)
- `src/pages/StudyView.test.tsx` (add tests for learning targets render)
- `e2e/tests/learning-targets.spec.ts` (new)

## Acceptance Criteria Mapping

| AC | How addressed |
|----|---------------|
| Generated activities display learning target labels (grammar + communicative function) | Labels derived from CurriculumEntry.GrammarFocus + Competencies at generation time |
| Labels derived from curriculum data, not hardcoded | EnsureLearningTargetsAsync queries CurriculumEntry by LessonId |
| Labels visible in lesson editor next to each content block | ContentBlock receives and displays learningTargets prop |
| Teachers can edit or remove labels | Inline tag editor in ContentBlock; PUT /api/lessons/{id}/learning-targets |
| Labels persist when lesson is saved and reloaded | Stored on Lesson entity; returned in LessonDto; invalidateQueries triggers reload |
| Labels appear in study view (read-only, for student reference) | StudyLessonDto includes learningTargets; StudyView renders them |
