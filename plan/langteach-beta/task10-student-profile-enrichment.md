# T10 — Student Profile Enrichment

## Context

The Phase 1 student model has five fields: Name, LearningLanguage, CefrLevel, Interests, Notes. The AI generation tasks (T11+) need richer student context to personalize content. Without native language, learning goals, and specific weaknesses, prompts will produce generic output and the demo fails at its core moment.

`IsApproved` on `Teachers` is deferred to T11 — it has no consumer in this task and no UI surface. Adding a dormant column here risks it being forgotten; it belongs in T11 where the 403 guard is actually implemented.

---

## Files Modified

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Data/Models/Student.cs` | Add 3 new fields |
| `backend/LangTeach.Api/DTOs/MaxCollectionCountAttribute.cs` | New validation attribute |
| `backend/LangTeach.Api/DTOs/MaxStringLengthEachAttribute.cs` | Generalize error messages (currently hardcodes "interests") |
| `backend/LangTeach.Api/DTOs/StudentDto.cs` | Add 3 new fields to the record |
| `backend/LangTeach.Api/DTOs/CreateStudentRequest.cs` | Add 3 new optional fields with validation |
| `backend/LangTeach.Api/DTOs/UpdateStudentRequest.cs` | Same additions |
| `backend/LangTeach.Api/Services/StudentService.cs` | Map new fields in `CreateAsync`, `UpdateAsync`, `MapToDto` |
| `backend/LangTeach.Api/Migrations/` | New migration `AddStudentEnrichmentFields` |
| `backend/LangTeach.Tests/` | New unit tests for StudentService new field mapping |
| `frontend/src/lib/studentOptions.ts` | New file: canonical option lists |
| `frontend/src/api/students.ts` | Add fields to `Student` interface and `StudentFormData` |
| `frontend/src/pages/StudentForm.tsx` | Add AI Personalization card with 3 fields |
| `frontend/src/pages/Students.tsx` | Show native language chip on student cards |
| `e2e/tests/students.spec.ts` | Extend existing test with new field assertions |

---

## Step-by-Step Implementation

### Step 1 — Backend model

**`Student.cs`** — add after `Interests`:
```csharp
public string? NativeLanguage { get; set; }
public string LearningGoals { get; set; } = "[]";
public string Weaknesses { get; set; } = "[]";
```

`LearningGoals` and `Weaknesses` follow the same JSON-array-in-nvarchar pattern as `Interests`. `NativeLanguage` is a plain nullable string.

No changes to `Teacher.cs` in this task — `IsApproved` moves to T11.

### Step 2 — EF Core migration

Run:
```
dotnet ef migrations add AddStudentEnrichmentFields --project LangTeach.Api
```

Verify the generated migration adds:
- `NativeLanguage nvarchar(max) NULL` on `Students`
- `LearningGoals nvarchar(max) NOT NULL DEFAULT '[]'` on `Students`
- `Weaknesses nvarchar(max) NOT NULL DEFAULT '[]'` on `Students`

If EF does not emit the `DEFAULT` values correctly in `Up()`, fix them manually before proceeding.

### Step 3 — Validation attributes

**`MaxStringLengthEachAttribute.cs`** — the current implementation hardcodes "interests" in error messages. Generalize it to use the member name from `ValidationContext`:
```csharp
return new ValidationResult(
    $"Each item in {context.MemberName} cannot exceed {maxLength} characters.",
    [context.MemberName!]);
```

**`MaxCollectionCountAttribute.cs`** (new file) — validates collection item count, not string length. `[MaxLength]` works on collections but its name implies string length and confuses readers:
```csharp
[AttributeUsage(AttributeTargets.Property)]
public sealed class MaxCollectionCountAttribute(int max) : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext context)
    {
        if (value is ICollection col && col.Count > max)
            return new ValidationResult(
                $"{context.MemberName} cannot have more than {max} items.",
                [context.MemberName!]);

        return ValidationResult.Success;
    }
}
```

### Step 4 — DTOs

**`StudentDto.cs`** — new record shape:
```csharp
public record StudentDto(
    Guid Id,
    string Name,
    string LearningLanguage,
    string CefrLevel,
    List<string> Interests,
    string? Notes,
    string? NativeLanguage,
    List<string> LearningGoals,
    List<string> Weaknesses,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
```

**`CreateStudentRequest.cs`** and **`UpdateStudentRequest.cs`** — add (identical additions to both):
```csharp
// Validated against LANGUAGES list in StudentService — backend rejects values not in the allowed set
[MaxLength(100)]
public string? NativeLanguage { get; set; }

[MaxCollectionCount(20)]
[MaxStringLengthEach(100)]
public List<string> LearningGoals { get; set; } = [];

[MaxCollectionCount(30)]
[MaxStringLengthEach(200)]
public List<string> Weaknesses { get; set; } = [];
```

### Step 5 — Backend NativeLanguage validation

The frontend uses a `<Select>` with a fixed `LANGUAGES` list, but the API accepts any string. Add a server-side check in `StudentService.CreateAsync` and `UpdateAsync` to reject values outside the allowed set:

```csharp
private static readonly HashSet<string> AllowedLanguages =
[
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Mandarin", "Japanese", "Arabic", "Other"
];
```

If `request.NativeLanguage` is non-null and not in `AllowedLanguages`, throw a `ValidationException` (or return a `ValidationProblem` from the controller — use whichever pattern is already established in the codebase). This prevents arbitrary strings reaching AI prompts via direct API calls.

### Step 6 — StudentService mapping

**`CreateAsync`** — add to the `Student` initializer:
```csharp
NativeLanguage = request.NativeLanguage,
LearningGoals = Serialize(request.LearningGoals),
Weaknesses = Serialize(request.Weaknesses),
```

**`UpdateAsync`** — add to the update block:
```csharp
student.NativeLanguage = request.NativeLanguage;
student.LearningGoals = Serialize(request.LearningGoals);
student.Weaknesses = Serialize(request.Weaknesses);
```

**`MapToDto`** — add to the record constructor:
```csharp
s.NativeLanguage,
Deserialize(s.LearningGoals),
Deserialize(s.Weaknesses),
```

`Serialize`/`Deserialize` already exist and handle `List<string>` — no new methods needed.

### Step 7 — Backend unit tests

Add tests to the existing student test class (or a new `StudentServiceEnrichmentTests` class) covering:

1. **Round-trip**: create a student with `NativeLanguage`, `LearningGoals`, `Weaknesses` — `MapToDto` returns the correct values.
2. **Null NativeLanguage**: create/update with `NativeLanguage = null` — no error, DTO has `null`.
3. **Empty arrays**: `LearningGoals = []` and `Weaknesses = []` round-trip as empty lists, not null.
4. **Invalid NativeLanguage**: service rejects a value not in `AllowedLanguages`.

### Step 8 — Frontend options file

**`frontend/src/lib/studentOptions.ts`** (new file):
```ts
// Option values are the canonical strings stored in the DB and injected into AI prompts.
// Labels are the display strings shown in the UI (title-cased for readability).
// NOTE: These options are English-grammar-centric. They are appropriate for students learning
// European languages. For Japanese, Arabic, or other non-European target languages, different
// weakness categories apply (e.g. pitch accent, particles, script). Extend this list or migrate
// to a DB-backed approach when supporting non-European language teachers.

export const LEARNING_GOALS: { value: string; label: string }[] = [
  { value: 'conversation', label: 'Conversation' },
  { value: 'business', label: 'Business' },
  { value: 'travel', label: 'Travel' },
  { value: 'exams', label: 'Exams' },
  { value: 'pronunciation', label: 'Pronunciation' },
  { value: 'writing', label: 'Writing' },
  { value: 'reading', label: 'Reading' },
]

export const WEAKNESSES: { value: string; label: string }[] = [
  { value: 'past tenses', label: 'Past Tenses' },
  { value: 'articles', label: 'Articles' },
  { value: 'subjunctive', label: 'Subjunctive' },
  { value: 'conditionals', label: 'Conditionals' },
  { value: 'phrasal verbs', label: 'Phrasal Verbs' },
  { value: 'pronunciation', label: 'Pronunciation' },
  { value: 'word order', label: 'Word Order' },
  { value: 'gender agreement', label: 'Gender Agreement' },
  { value: 'reported speech', label: 'Reported Speech' },
  { value: 'vocabulary range', label: 'Vocabulary Range' },
]
```

`value` is what gets stored in the DB and injected into prompts. `label` is what the UI displays. Add entries here when the list needs to grow.

### Step 9 — Frontend API client

**`frontend/src/api/students.ts`** — add to `Student` interface:
```ts
nativeLanguage: string | null
learningGoals: string[]
weaknesses: string[]
```

Add to `StudentFormData`:
```ts
nativeLanguage?: string | null
learningGoals: string[]
weaknesses: string[]
```

### Step 10 — StudentForm.tsx

Add a new card "AI Personalization" (below Interests, above Notes) with three fields:

**Native Language** — `<Select>` using the existing `LANGUAGES` constant. Optional. `data-testid="student-native-language"` on the trigger.

**Learning Goals** — multi-select using shadcn `Command` + `Popover`. Options from `LEARNING_GOALS` in `studentOptions.ts`. Selected values rendered as dismissible chips. `data-testid="learning-goals-trigger"` on the trigger, `data-testid="learning-goal-chip"` on each chip.

**Weaknesses** — same pattern. `data-testid="weaknesses-trigger"` on the trigger, `data-testid="weakness-chip"` on each chip.

State variables:
```ts
const [nativeLanguage, setNativeLanguage] = useState<string>('')
const [learningGoals, setLearningGoals] = useState<string[]>([])
const [weaknesses, setWeaknesses] = useState<string[]>([])
```

Populate from `existing` in the `useEffect` hook:
```ts
setNativeLanguage(existing.nativeLanguage ?? '')
setLearningGoals(existing.learningGoals)
setWeaknesses(existing.weaknesses)
```

`handleSubmit` mutation payload:
```ts
mutate({
  ...,
  nativeLanguage: nativeLanguage || null,  // explicit null, not undefined
  learningGoals,
  weaknesses,
})
```

### Step 11 — Students.tsx (list view)

Add a native language chip after the CEFR badge:
```tsx
{student.nativeLanguage && (
  <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200" data-testid="native-language-chip">
    {student.nativeLanguage} speaker
  </Badge>
)}
```

`learningGoals` and `weaknesses` not shown on the list — card is already dense.

### Step 12 — Playwright (e2e/tests/students.spec.ts)

Extend the existing `full student CRUD flow` test. After selecting CEFR level:

```ts
// Select native language
await page.getByTestId('student-native-language').click()
await page.getByRole('option', { name: 'Portuguese' }).click()

// Select a learning goal
await page.getByTestId('learning-goals-trigger').click()
await page.getByRole('option', { name: 'Travel' }).click()
await page.keyboard.press('Escape')

// Select a weakness
await page.getByTestId('weaknesses-trigger').click()
await page.getByRole('option', { name: 'Past Tenses' }).click()
await page.keyboard.press('Escape')
```

After redirect to the student list:
```ts
await expect(studentCard.getByTestId('native-language-chip')).toContainText('Portuguese speaker')
```

Round-trip check: click Edit, confirm native language shows 'Portuguese' and goals/weaknesses chips are populated.

---

## Verification Checklist

1. `dotnet build` — zero warnings, zero errors
2. `dotnet test` — all existing tests pass + new unit tests pass
3. `npm run build` — zero errors
4. Manual smoke: create student with all new fields, refresh, confirm persistence
5. Manual smoke: create student with no new fields (all optional), confirm no errors
6. Manual smoke: edit an existing student, confirm new fields pre-populate
7. Direct API call with invalid `NativeLanguage` value — confirm 400 response
8. `npx playwright test e2e/tests/students.spec.ts` — passes with new assertions

---

## Notes and Decisions

- **`IsApproved` deferred to T11**: no consumer in T10, no UI surface. Adding a dormant column risks it being forgotten. T11 is where the 403 guard is implemented — that is the right place for the column too.
- **`MaxCollectionCount` over `[MaxLength]` on collections**: `[MaxLength]` works but its name implies string length. New attribute is self-documenting.
- **`MaxStringLengthEachAttribute` generalized**: currently hardcodes "interests" in error messages — fix to use `context.MemberName` so it works correctly for `LearningGoals` and `Weaknesses` too.
- **`NativeLanguage` backend validation**: frontend enforces a fixed dropdown, but the API must also reject arbitrary strings to prevent prompt injection via direct API calls.
- **`value`/`label` separation in `studentOptions.ts`**: `value` goes to the DB and into prompts; `label` is display-only. This avoids the prompt service receiving title-cased strings like "Past Tenses" when it expects "past tenses".
- **English-centric weakness list**: documented in `studentOptions.ts`. Appropriate for European language teaching (the beta target). Extend or DB-back if non-European language support is added.
- **`nativeLanguage || null` not `|| undefined`**: explicit null ensures the backend receives a JSON null, not a missing field, avoiding ambiguity if the API ever differentiates the two.
- **Storage unchanged**: JSON array in nvarchar for all array fields — same as `Interests`. No join tables needed for beta. UI can migrate to combobox/DB-backed without touching the schema.
