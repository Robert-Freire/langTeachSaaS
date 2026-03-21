# Task 164: Integrate curriculum data as Course Planner templates and grammar constraints

## Goal

Wire the extracted Instituto Educativo curriculum JSON into the app:
1. Course Planner templates: teachers can create a course from a curriculum template instead of using AI generation
2. Grammar constraints: the prompt service uses level-specific grammar lists to constrain AI generation

---

## Architecture overview

The JSON files live at `data/curricula/instituto_educativo/*.json` in the repo root (30 files: A1.1 through C2.6). They are embedded into the backend assembly at build time. A new `CurriculumTemplateService` loads them all at startup (singleton). A new controller exposes them over HTTP. The frontend shows a template picker in CourseNew. When a template is used, the backend maps template units to curriculum entries instead of calling Claude for curriculum generation. The prompt service accepts optional grammar constraints, and GenerateController looks them up per CEFR level before calling Claude.

---

## Backend changes

### 1. Embed JSON files in the project

Add to `backend/LangTeach.Api/LangTeach.Api.csproj`:

```xml
<ItemGroup>
  <EmbeddedResource Include="..\..\data\curricula\instituto_educativo\*.json"
                    Link="Curricula\%(Filename)%(Extension)" />
</ItemGroup>
```

This embeds all 30 JSON files into the assembly. At service startup, enumerate them with `Assembly.GetManifestResourceNames()` filtered by the `"Curricula."` prefix rather than constructing names by convention, since dots in filenames like "A1.1.json" make resource name prediction unreliable.

### 2. CurriculumTemplateService

New file: `Services/CurriculumTemplateService.cs`

**Interface** `ICurriculumTemplateService`:
```csharp
IReadOnlyList<CurriculumTemplateSummary> GetAll();
CurriculumTemplateData? GetByLevel(string level);
IReadOnlyList<string> GetGrammarForCefrPrefix(string cefrPrefix);
```

**Implementation**: loads all templates from embedded resources in the constructor (singleton). The service deserializes each JSON file into an internal model and builds two caches:
- `_byLevel: Dictionary<string, CurriculumTemplateData>` keyed by "A1.1", "B2.3", etc.
- `_grammarByPrefix: Dictionary<string, IReadOnlyList<string>>` keyed by "A1", "B1", etc., aggregating grammar from all sub-levels

`GetGrammarForCefrPrefix("B1")` returns the deduplicated union of all grammar strings from B1.1, B1.2, B1.3, B1.4, B1.5.

**DTOs** (new file `DTOs/CurriculumTemplateDtos.cs`):
```csharp
record CurriculumTemplateSummary(string Level, string CefrLevel, int UnitCount, IReadOnlyList<string> SampleGrammar);
record CurriculumTemplateData(string Level, string CefrLevel, IReadOnlyList<CurriculumTemplateUnit> Units);
record CurriculumTemplateUnit(int UnitNumber, string Title, string OverallGoal,
    IReadOnlyList<string> Grammar, IReadOnlyList<string> VocabularyThemes,
    IReadOnlyList<string> CommunicativeFunctions);
```

`SampleGrammar` in summary = first 3 grammar items from the first unit.

Register as singleton in `Program.cs`.

### 3. CurriculumTemplatesController

New file: `Controllers/CurriculumTemplatesController.cs`

```
GET /api/curriculum-templates        -> list of CurriculumTemplateSummary (no auth needed for listing)
GET /api/curriculum-templates/{level} -> CurriculumTemplateData or 404
```

Actually, keep auth on both to match the rest of the API pattern. Both endpoints are GET with [Authorize].

### 4. Modify CreateCourseRequest

Add to `DTOs/CreateCourseRequest.cs`:
```csharp
// e.g. "A1.1", "B2.3" -- only valid when Mode == "general"
[RegularExpression(@"^[ABC][12]\.\d+\+?$", ErrorMessage = "Invalid TemplateLevel format.")]
[MaxLength(10)]
public string? TemplateLevel { get; set; }
```

### 5. Modify CoursesController.Create

Inject `ICurriculumTemplateService`. In the Create action:

```csharp
if (!string.IsNullOrEmpty(request.TemplateLevel))
{
    // Validate: mode must be general
    if (request.Mode != "general")
        return BadRequest("TemplateLevel can only be used with mode 'general'.");

    var template = _templateService.GetByLevel(request.TemplateLevel);
    if (template is null)
        return BadRequest($"Template '{request.TemplateLevel}' not found.");

    entries = template.Units.Select((u, i) => new CurriculumEntry
    {
        Id = Guid.NewGuid(),
        OrderIndex = i + 1,
        // Include communicative functions in topic so they appear in the planner view.
        // Vocabulary themes are shown only in the template preview card (no model field for them).
        Topic = u.CommunicativeFunctions.Count > 0
            ? $"{u.Title}: {string.Join(", ", u.CommunicativeFunctions.Take(2))}"
            : u.Title,
        GrammarFocus = u.Grammar.Count > 0 ? string.Join(", ", u.Grammar) : null,
        Competencies = "reading,writing,listening,speaking",
        LessonType = "Communicative",
        Status = "planned"
    }).ToList();

    // Override session count to match template unit count
    request.SessionCount = entries.Count;
}
else
{
    // AI generation path; ctx (CurriculumContext) is built before this branch regardless
    // because student data is still needed for course.StudentId -- the wasted ctx build is intentional
    entries = await _curriculumService.GenerateAsync(ctx, ct);
}
```

Course is saved with `SessionCount = entries.Count` when using a template.

### 6. Add GrammarConstraints to GenerationContext

In `AI/IPromptService.cs`, add to `GenerationContext` record:
```csharp
IReadOnlyList<string>? GrammarConstraints = null
```

In `PromptService.BuildSystemPrompt`, after the existing level constraint line, add:
```csharp
if (ctx.GrammarConstraints is { Count: > 0 })
{
    sb.AppendLine();
    sb.AppendLine($"Target grammar structures for {cefrLevel} (from curriculum syllabus). Use only these and lower-level structures in examples:");
    foreach (var g in ctx.GrammarConstraints)
        sb.AppendLine($"- {Sanitize(g)}");
}
```

### 7. Modify GenerateController

Inject `ICurriculumTemplateService`. When building `GenerationContext` in both `Generate()` and `Stream()`:

```csharp
var grammarConstraints = _templateService.GetGrammarForCefrPrefix(cefrLevel);
var ctx = new GenerationContext(
    ...existing fields...,
    GrammarConstraints: grammarConstraints.Count > 0 ? grammarConstraints : null
);
```

`cefrLevel` is e.g. "B1" (the `request.CefrLevel` field). The template service maps "B1" to all grammar from B1.1-B1.5. If no templates exist for that prefix (e.g., "English" course), returns empty list and GrammarConstraints stays null.

---

## Frontend changes

### 1. New API client: `frontend/src/api/curricula.ts`

```typescript
export interface CurriculumTemplateSummary {
  level: string          // "B1.2"
  cefrLevel: string      // "B1"
  unitCount: number
  sampleGrammar: string[]
}

export interface CurriculumTemplateData {
  level: string
  cefrLevel: string
  units: CurriculumTemplateUnit[]
}

export interface CurriculumTemplateUnit {
  unitNumber: number
  title: string
  overallGoal: string
  grammar: string[]
  vocabularyThemes: string[]
  communicativeFunctions: string[]
}

export async function getCurriculumTemplates(): Promise<CurriculumTemplateSummary[]>
export async function getCurriculumTemplate(level: string): Promise<CurriculumTemplateData>
```

### 2. Modify CreateCourseRequest type in `frontend/src/api/courses.ts`

Add `templateLevel?: string` to `CreateCourseRequest`.

### 3. Modify CourseNew.tsx

After CEFR level is selected (general mode only), show template picker section:

```
[ ] Use Instituto Cervantes curriculum template
    If checked:
      - Fetch templates filtered by cefrLevel prefix
      - Show dropdown: "A1.1 (7 units)", "A1.2 (5 units)", etc.
      - Show sample grammar preview card (first 3 grammar items)
      - Session count auto-set to template unit count, picker disabled with note
      - Button label: "Create from Template" (instead of "Generate Curriculum")
      - Loading message: "Creating course from template..." (no spinner needed - should be fast)
```

State additions:
```typescript
const [useTemplate, setUseTemplate] = useState(false)
const [selectedTemplate, setSelectedTemplate] = useState<string>('')
```

Query for templates (lazy, only when `useTemplate` is true and `targetCefrLevel` is set):
```typescript
const { data: templates } = useQuery({
  queryKey: ['curriculum-templates', targetCefrLevel],
  queryFn: () => getCurriculumTemplates(),
  select: (all) => all.filter(t => t.cefrLevel === targetCefrLevel),
  enabled: useTemplate && !!targetCefrLevel && mode === 'general',
})
```

Pass to create request:
```typescript
templateLevel: useTemplate && selectedTemplate ? selectedTemplate : undefined,
```

Form validity: when `useTemplate` is true, also require `selectedTemplate` to be set.

---

## Tests

### Backend unit tests

**New file: `LangTeach.Api.Tests/Controllers/CoursesControllerTemplateTests.cs`** (no existing CoursesController tests)
- Test: POST /api/courses with valid `TemplateLevel` returns 201 with entries matching template units (mock `ICurriculumTemplateService`)
- Test: POST /api/courses with `TemplateLevel` but mode=exam-prep returns 400
- Test: POST /api/courses with unknown `TemplateLevel` returns 400
- Test: POST /api/courses without `TemplateLevel` still calls AI generation (existing path unchanged)

**New file: `LangTeach.Api.Tests/Services/CurriculumTemplateServiceTests.cs`**
- Loads service (embedded resources available in test assembly? No - the test project does not embed them)
- Since the service reads from embedded resources of `LangTeach.Api` assembly, tests should be able to call the real service (no mocking needed) because the main assembly is referenced
- Test: `GetAll()` returns at least 40 templates
- Test: `GetByLevel("A1.1")` returns template with expected unit count (>= 5)
- Test: `GetByLevel("zz.99")` returns null
- Test: `GetGrammarForCefrPrefix("A1")` returns non-empty list
- Test: `GetGrammarForCefrPrefix("XX")` returns empty list

**Modify `LangTeach.Api.Tests/AI/PromptServiceTests.cs`** (file already exists):
- Test: call `BuildLessonPlanPrompt(ctx)` with `GrammarConstraints` set; assert `result.SystemPrompt` contains "Target grammar structures"
- Test: call `BuildLessonPlanPrompt(ctx)` without `GrammarConstraints`; assert `result.SystemPrompt` does NOT contain "Target grammar structures"

### Frontend unit tests

**New file: `frontend/src/pages/CourseNew.test.tsx`**
- Existing CourseNew tests (if any) extended or new file
- Test: template toggle appears only in general mode after CEFR level selected
- Test: selecting a template populates template dropdown and disables session count
- Test: submitting with template sends `templateLevel` in request body
- Test: submitting without template does NOT send `templateLevel`

### E2E test

**Extend `e2e/tests/courses.spec.ts`** with new test:
- Mock `GET /api/curriculum-templates` to return sample templates for "B1"
- Mock `POST /api/courses` to expect `templateLevel: "B1.1"` in body and return fixture with template-based entries
- Test flow: go to /courses/new, select general mode, pick B1, toggle template on, pick "B1.1", verify session count auto-set, submit, verify navigate to course detail

---

## File list

**New files:**
- `backend/LangTeach.Api.Tests/Controllers/CoursesControllerTemplateTests.cs`
- `backend/LangTeach.Api/Services/CurriculumTemplateService.cs`
- `backend/LangTeach.Api/DTOs/CurriculumTemplateDtos.cs`
- `backend/LangTeach.Api/Controllers/CurriculumTemplatesController.cs`
- `frontend/src/api/curricula.ts`
- `backend/LangTeach.Api.Tests/Services/CurriculumTemplateServiceTests.cs`
- `frontend/src/pages/CourseNew.test.tsx`

**Modified files:**
- `backend/LangTeach.Api/LangTeach.Api.csproj` (embed resources)
- `backend/LangTeach.Api/DTOs/CreateCourseRequest.cs` (add TemplateLevel)
- `backend/LangTeach.Api/Controllers/CoursesController.cs` (template path in Create)
- `backend/LangTeach.Api/AI/IPromptService.cs` (GrammarConstraints in GenerationContext)
- `backend/LangTeach.Api/AI/PromptService.cs` (grammar constraint section in system prompt)
- `backend/LangTeach.Api/Controllers/GenerateController.cs` (look up + pass grammar constraints)
- `backend/LangTeach.Api/Program.cs` (register ICurriculumTemplateService singleton)
- `frontend/src/api/courses.ts` (add templateLevel to CreateCourseRequest)
- `frontend/src/pages/CourseNew.tsx` (template picker UI)
- `e2e/tests/courses.spec.ts` (add template creation test)

---

## Acceptance criteria checklist

- [ ] Course Planner offers Instituto Cervantes templates when creating a new course
- [ ] Templates pre-populate units with grammar, vocabulary, and communicative objectives
- [ ] Teachers can edit/customize templates after selection (uses existing entry edit functionality)
- [ ] Prompt service uses grammar-by-level data to constrain generation
- [ ] Generated content for a level does not include structures above that level
