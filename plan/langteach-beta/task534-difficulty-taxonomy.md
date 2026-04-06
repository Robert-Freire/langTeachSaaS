# Task 534 — Structured Difficulty Taxonomy: Schema, Covered State, Severity and Trend

## What we're building

Restructure `DifficultyDto` from the old `{id, category, item, severity, trend}` shape to the canonical `{id, description, competency, subcategory, severity, trend, status}` shape. Add:
- `status` (Active/Covered), teacher-controlled from the student profile
- `subcategory` (free text, AI-proposed, teacher-editable)
- `competency` (fixed 5-value enum replacing the old free-form `category`)
- System-computed `trend` based on per-session difficulty mentions
- Prompt routing that feeds only `Active` difficulties to AI generation

## Current state

- `DifficultyDto`: `record DifficultyDto(string Id, string Category, string Item, string Severity, string Trend)`
- Competencies (incorrectly called categories): `grammar, vocabulary, pronunciation, writing, comprehension`
- `Severity` and `Trend` are currently teacher-set in the UI
- `SessionLog` has no per-session difficulty tracking
- `PromptService` uses all difficulties regardless of status

## Schema diff

| Old field | New field | Notes |
|-----------|-----------|-------|
| `Category` | `Competency` | enum: Grammar, Vocabulary, Pronunciation, Fluency, Discourse |
| `Item` | `Description` | free text, full sentence |
| _(new)_ | `Subcategory` | free text, AI-proposed; teacher-editable |
| `Severity` | `Severity` | stays; enum: low, medium, high; AI-set only |
| `Trend` | `Trend` | stays; system-computed; never teacher-set |
| _(new)_ | `Status` | enum: Active, Covered; teacher-controlled |

## e2e test coverage plan (write first / alongside)

| Test | Location |
|------|----------|
| Add difficulty with new fields (description, competency, subcategory, status) | `students.spec.ts` |
| Mark difficulty as Covered from student profile; verify AI prompt exclusion | `students.spec.ts` |
| Session log with mentioned difficulties; re-open session log; verify checkboxes persist | `session-log.spec.ts` |
| Trend worsening: create 3 session logs mentioning same pair → verify trend=worsening | new `difficulty-trend.spec.ts` |

---

## Step-by-step implementation

### Step 1: Backend — DifficultyDto and validation

**`backend/LangTeach.Api/DTOs/DifficultyDto.cs`**
```csharp
public record DifficultyDto(
    string Id,
    string Description,
    string Competency,
    string Subcategory,
    string Severity,
    string Trend,
    string Status
);
```

**`backend/LangTeach.Api/Services/StudentService.cs`**

Replace:
- `AllowedDifficultyCategories` → `AllowedCompetencies = ["Grammar","Vocabulary","Pronunciation","Fluency","Discourse"]`
- Remove `AllowedTrends` (trend is system-set; teacher cannot submit trend directly; ignore any submitted value)
- Add `AllowedStatuses = ["Active","Covered"]`

`ValidateDifficulties` updated rules:
- `Id`: required, max 100 chars
- `Description`: required, max 500 chars (was `Item`)
- `Competency`: must be in `AllowedCompetencies` (was `Category`)
- `Subcategory`: optional, max 200 chars
- `Severity`: must be in `AllowedSeverityLevels` (unchanged); default `"medium"` if empty
- `Status`: must be in `AllowedStatuses`; default `"Active"` if empty
- `Trend`: silently default to `"stable"` if missing/invalid; never reject based on trend

Also update `TopDifficulties` helper in `GenerateController.cs` (line 455) to filter `d.Status == "Active"` before taking top 3.

**`backend/LangTeach.Api/DTOs/CreateStudentRequest.cs`** and **`UpdateStudentRequest.cs`**: no structural change needed (they reference `List<DifficultyDto>`, which gets the new shape automatically).

### Step 2: Backend — MentionedDifficultyPairs on SessionLog

Tracks which competency+subcategory pairs the teacher observed in each session. Used for trend computation.

**New DTO (`SessionLogDtos.cs`):**
```csharp
public record DifficultyPairDto(string Competency, string Subcategory);
```

**`CreateSessionLogRequest` and `UpdateSessionLogRequest`:** add:
```csharp
public List<DifficultyPairDto>? MentionedDifficultyPairs { get; set; }
```

**`SessionLogDto`:** add `string MentionedDifficultyPairs` (serialized JSON, default `"[]"`).

**`SessionLog` model (`Data/Models/SessionLog.cs`):** add:
```csharp
public string MentionedDifficultyPairs { get; set; } = "[]";
```

**Migration:** `AddMentionedDifficultyPairsToSessionLog`
- Adds `MentionedDifficultyPairs nvarchar(max) NOT NULL DEFAULT '[]'` to `SessionLogs`
- Resets all existing student `Difficulties` to `'[]'` (per issue: "no real data to protect")
  - SQL: `UPDATE Students SET Difficulties = '[]' WHERE Difficulties != '[]'`

### Step 3: Backend — DifficultyTrendService

New service responsible for recomputing trend on all student difficulties after a session log is confirmed.

**`Services/IDifficultyTrendService.cs`:**
```csharp
public interface IDifficultyTrendService
{
    Task RecomputeAsync(Guid teacherId, Guid studentId, CancellationToken ct = default);
}
```

**`Services/DifficultyTrendService.cs`:**

Logic:
1. Load student (need to update Difficulties JSON)
2. Load all non-deleted, non-cancelled session logs for student, ordered chronologically (ascending by `SessionDate`, nulls last)
3. Deserialize `MentionedDifficultyPairs` from each session log
4. Deserialize current `Difficulties` from student
5. For each difficulty:
   - Identity key = `(competency.ToLower(), subcategory.ToLower())`
   - Build "appears in session N" boolean list (chronological, most recent last)
   - `worsening`: the last 3 (or more) sessions all contain this pair as consecutive appearances from the end
   - `improving`: `difficulty.Status == "Covered"` AND the pair did NOT appear in either of the 2 most recent session logs
   - `stable`: all other cases
6. Update each difficulty's `Trend` field
7. Re-serialize and save `student.Difficulties`
8. `student.UpdatedAt = now`
9. `SaveChangesAsync`

**Consecutive worsening logic:**
```
sessions = [s1, s2, s3, s4, s5] (chronological)
mentionedInSession = [T, F, T, T, T]
consec = count of trailing Trues = 3 → worsening
```

**Register in `Program.cs`:** `builder.Services.AddScoped<IDifficultyTrendService, DifficultyTrendService>()`

### Step 4: Backend — SessionLogService calls trend recomputation

In `SessionLogService.CreateAsync` and `UpdateAsync`:
1. Serialize `request.MentionedDifficultyPairs` to JSON and store in `entity.MentionedDifficultyPairs`
2. After `SaveChangesAsync`, call `await _trendService.RecomputeAsync(teacherId, studentId, cancellationToken)`

Inject `IDifficultyTrendService` into `SessionLogService`.

### Step 5: Backend — PromptService and GenerateController

**`GenerateController.cs`, `TopDifficulties` (line 455):**
```csharp
private static DifficultyDto[]? TopDifficulties(StudentDto? student) =>
    student?.Difficulties
        .Where(d => string.Equals(d.Status, "Active", StringComparison.OrdinalIgnoreCase))
        .OrderByDescending(d => d.Severity switch { "high" => 3, "medium" => 2, _ => 1 })
        .Take(3)
        .ToArray();
```

**`CourseService.cs` line ~350** — apply the same `Active`-only filter:
```csharp
StudentDifficulties: student is not null
    ? JsonStorageHelper.DeserializeList<DifficultyDto>(student.Difficulties)
        .Where(d => string.Equals(d.Status, "Active", StringComparison.OrdinalIgnoreCase))
        .ToArray()
    : null,
```

Note: `PromptService` itself does NOT filter by status; it relies on callers to pre-filter before passing `StudentDifficulties`. Both `GenerateController` (via `TopDifficulties`) and `CourseService` are the only two callers — both must apply the `Active`-only filter.

**`PromptService.cs`** (lines ~399-401 and ~1122-1127):
- Replace `d.Category` with `d.Competency`
- Replace `d.Item` with `d.Description`

### Step 6: Frontend — Difficulty type update

**`frontend/src/api/students.ts`** — `Difficulty` interface:
```typescript
export interface Difficulty {
  id: string
  description: string      // was item
  competency: string       // was category
  subcategory: string
  severity: string         // AI-set, read-only in form
  trend: string            // system-computed, read-only
  status: string           // Active | Covered
}
```

Update `StudentFormData.difficulties: Difficulty[]` — unchanged shape reference.

**`frontend/src/api/sessionLogs.ts`** — add to create/update request types:
```typescript
mentionedDifficultyPairs?: { competency: string; subcategory: string }[]
```

Also update `SessionLog` type to include `mentionedDifficultyPairs: string`.

### Step 7: Frontend — studentOptions.ts

Replace `DIFFICULTY_CATEGORIES` with `COMPETENCY_OPTIONS`:
```typescript
export const COMPETENCY_OPTIONS: Option[] = [
  { value: 'Grammar', label: 'Grammar' },
  { value: 'Vocabulary', label: 'Vocabulary' },
  { value: 'Pronunciation', label: 'Pronunciation' },
  { value: 'Fluency', label: 'Fluency' },
  { value: 'Discourse', label: 'Discourse' },
]
```

Remove `TREND_OPTIONS` export (no longer used in form).
Keep `SEVERITY_LEVELS` (shown as read-only badge, not input).

### Step 8: Frontend — StudentForm.tsx

**Form changes for each difficulty row:**

Old: `[item | category | severity | trend | remove]`
New: `[description | competency | subcategory | status-badge | remove]`

- `description` (text input, `data-testid="difficulty-description"`)
- `competency` (select from 5 options, `data-testid="difficulty-competency"`)
- `subcategory` (text input, `data-testid="difficulty-subcategory"`)
- `status` (pill toggle Active/Covered, `data-testid="difficulty-status"`) — inline toggle
- `remove` button (unchanged)
- `severity` and `trend` are NOT shown as inputs; they're read-only badges displayed on existing entries

`addDifficulty()` default: `{ id, description: '', competency: '', subcategory: '', severity: 'medium', trend: 'stable', status: 'Active' }`

`handleSubmit` filter: keep difficulties where `description.trim()` and `competency` are non-empty. (Subcategory is optional.)

Update imports: `COMPETENCY_OPTIONS` instead of `DIFFICULTY_CATEGORIES`; remove `SEVERITY_LEVELS`, `TREND_OPTIONS` from destructure.

### Step 9: Frontend — StudentProfileOverview.tsx

Update difficulty rendering (lines ~80-91):
- Use `d.description` (was `d.item`), `d.competency` (was `d.category`)
- Add `d.subcategory` display
- Add status badge: Active = indigo chip, Covered = muted gray chip with strikethrough description
- Add inline "Mark as Covered" / "Mark as Active" button per difficulty row (calls `updateStudent` with toggled status)

This requires access to `mutate` or a parent callback. Simplest approach: pass an `onToggleCoveredStatus` callback from parent, or fetch student data locally within the overview component via `useQuery` and `useMutation`.

Given `StudentProfileOverview` is already rendered inside `StudentDetail` which has the student data, use the **callback approach**: add `onToggleDifficultyStatus?: (id: string, status: 'Active' | 'Covered') => void` prop to `StudentProfileOverview`. Implement the `updateStudent` mutation in `StudentDetail.tsx` and pass the handler down.

**`StudentDetail.tsx` changes required:**
- Import `updateStudent` from `../api/students`
- Add `useMutation` for `updateStudent`, passing the full student payload with the toggled difficulty status
- Pass `onToggleDifficultyStatus` callback to `<StudentProfileOverview>`
- Invalidate `['students', id]` query on success

### Step 10: Frontend — TargetedDifficulties.tsx and generate.ts

**`frontend/src/api/generate.ts`** — `TargetedDifficulty`:
```typescript
export interface TargetedDifficulty {
  competency: string   // was category
  description: string  // was item
  severity: string
}
```

**`frontend/src/components/lesson/TargetedDifficulties.tsx`**:
- Replace `d.category` → `d.competency`, `d.item` → `d.description`
- Key: `${d.competency}-${d.description}-${i}`
- Display: `[{d.competency}] {d.description}`

### Step 11: Frontend — SessionLogDialog.tsx

Add a "Difficulties observed this session" section:
- Fetch student using `useQuery(['students', studentId], () => getStudent(studentId))` (student data already cached if StudentDetail loaded it)
- List Active difficulties with checkboxes
- Selected ones become `mentionedDifficultyPairs` in the create/update request
- On edit (existing session log): pre-check based on `JSON.parse(session.mentionedDifficultyPairs)`
- Place after the `GeneralNotes` field, before the submit button

`data-testid="mentioned-difficulty-{competency}-{subcategory}"` for each checkbox.

If student has no Active difficulties: show nothing (no empty section).

### Step 12: Unit tests

**`DifficultyTrendService` (backend):**
- `RecomputeAsync_NoSessions_AllStable`
- `RecomputeAsync_ThreeConsecutiveSessions_Worsening`
- `RecomputeAsync_TwoConsecutiveOnly_Stable`
- `RecomputeAsync_CoveredNotMentionedLastTwo_Improving`
- `RecomputeAsync_CoveredMentionedRecently_Stable`

**`StudentService` updated tests (backend):** verify new competency enum and status validation.

**`StudentForm` (frontend Vitest/RTL):**
- Update: uses `difficulty-description` (not `difficulty-item`)
- Update: uses `difficulty-competency` (not `difficulty-category`)
- Verify no severity/trend inputs in difficulty row

### Step 13: e2e tests

**`students.spec.ts`** — update existing difficulty test (lines ~107-193):
- Fill `difficulty-description` instead of `difficulty-item`
- Fill `difficulty-competency` instead of `difficulty-category`
- Add `difficulty-subcategory` fill
- Remove `difficulty-severity` and `difficulty-trend` interactions
- Add status toggle assertion

**`session-log.spec.ts`:** add test for mentioned difficulties checkbox section.

**`difficulty-trend.spec.ts`** (new):
- Create student with one Active difficulty (competency=Grammar, subcategory=ser/estar)
- Create session log 1 mentioning that pair → verify trend=stable (only 1)
- Create session log 2 mentioning that pair → verify trend=stable (only 2)
- Create session log 3 mentioning that pair → verify trend=worsening (3 consecutive)

---

## File checklist

### Backend
- [ ] `DTOs/DifficultyDto.cs`
- [ ] `DTOs/SessionLogDtos.cs` (add `DifficultyPairDto`, update requests/dto)
- [ ] `Data/Models/SessionLog.cs`
- [ ] `Services/IDifficultyTrendService.cs` (new)
- [ ] `Services/DifficultyTrendService.cs` (new)
- [ ] `Services/SessionLogService.cs`
- [ ] `Services/StudentService.cs`
- [ ] `Services/CourseService.cs` (add Active-only filter at line ~350)
- [ ] `AI/PromptService.cs`
- [ ] `Controllers/GenerateController.cs`
- [ ] `Program.cs`
- [ ] New migration: `AddMentionedDifficultyPairsToSessionLog`
- [ ] `LangTeach.Api.Tests` — new `DifficultyTrendServiceTests.cs`
- [ ] `LangTeach.Api.Tests` — add to `StudentServiceTests.cs`: tests for new `Competency` enum validation and `Status` enum validation (new tests, not update of existing)

### Frontend
- [ ] `src/api/students.ts`
- [ ] `src/api/sessionLogs.ts`
- [ ] `src/api/generate.ts`
- [ ] `src/lib/studentOptions.ts`
- [ ] `src/pages/StudentForm.tsx`
- [ ] `src/pages/StudentForm.test.tsx`
- [ ] `src/pages/StudentDetail.tsx` (add `updateStudent` mutation; pass `onToggleDifficultyStatus` to `StudentProfileOverview`)
- [ ] `src/components/student/StudentProfileOverview.tsx`
- [ ] `src/components/session/SessionLogDialog.tsx`
- [ ] `src/components/session/SessionLogDialog.test.tsx`
- [ ] `src/components/lesson/TargetedDifficulties.tsx`
- [ ] `src/components/lesson/TargetedDifficulties.test.tsx`

### e2e
- [ ] `e2e/tests/students.spec.ts`
- [ ] `e2e/tests/session-log.spec.ts`
- [ ] `e2e/tests/difficulty-trend.spec.ts` (new)

---

## Decisions made

1. **Trend computation trigger**: occurs on every session log create/update (both are "confirms" in teacher workflow). The `DifficultyTrendService` is called synchronously before returning the response; it's lightweight (in-process JSON ops + one DB write).

2. **MentionedDifficultyPairs is teacher-supplied**: the teacher checks which difficulties appeared in the session log dialog. There is no AI auto-extraction per session for trend purposes (that would require a separate AI call and is not specified in the issue). The session log dialog shows the student's Active difficulties as a checklist.

3. **Migration resets Difficulties to `[]`**: the issue explicitly states "no real data to protect". This avoids needing to translate old field names.

4. **No dedicated patch endpoint for difficulty status**: teachers toggle status via the normal student update flow (PUT /api/students/{id}). The profile overview has an inline button that calls `updateStudent` with the patched difficulty list.

5. **`severity` defaults to `"medium"` on new teacher-added entries**: teachers do not set severity; AI sets it when extracting from session notes. For manually added entries, we default to `"medium"` silently.

6. **`trend` defaults to `"stable"` on all new entries**: it becomes meaningful only after session logs are created.
