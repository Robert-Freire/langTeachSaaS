# T17: PDF Export

## Context

Teachers need to print or share lesson materials. Two modes: a **Teacher Copy** (full content with answer keys, notes, timing) and a **Student Handout** (clean version without answers or teacher metadata). Backend generates PDFs using QuestPDF, frontend adds an export button to the lesson editor toolbar.

## Implementation Steps

### 1. Install QuestPDF + DI Registration

- Add `QuestPDF` NuGet package to `backend/LangTeach.Api/LangTeach.Api.csproj`
- In `Program.cs`: set `QuestPDF.Settings.License = LicenseType.Community` and register `IPdfExportService`

### 2. Extract fence-stripping utility

**New file:** `backend/LangTeach.Api/Helpers/ContentJsonHelper.cs`

Extract the markdown fence-stripping logic from `LessonContentBlocksController.TryParseContent()` (lines 40-46) into a static `ContentJsonHelper.StripFences(string?)` method. Update `TryParseContent` to call this helper (keeping backward compat). The PDF service will also use this helper before deserializing content JSON.

### 3. Content Model Records (backend mirrors of frontend types)

**New file:** `backend/LangTeach.Api/Services/PdfExport/ContentModels.cs`

C# records matching `frontend/src/types/contentTypes.ts`:
- `VocabularyContent { Items[] }` with `VocabularyItem { Word, Definition, ExampleSentence, Translation }`
- `GrammarContent { Title, Explanation, Examples[], CommonMistakes[] }`
- `ExercisesContent { FillInBlank[], MultipleChoice[], Matching[] }`
- `ConversationContent { Scenarios[] }` with setup, roles, phrases, plus optional `KeyPhrases` for backward compat with old lessons
- `ReadingContent { Passage, ComprehensionQuestions[], VocabularyHighlights[] }`
- `HomeworkContent { Tasks[] }` with type, instructions, examples
- `LessonPlanContent { Title, Objectives[], Sections }` with `LessonPlanSections { WarmUp, Presentation, Practice, Production, WrapUp }`

All records must use `JsonSerializerOptions { PropertyNameCamelCase = true }` and handle unknown properties gracefully (use `JsonUnmappedMemberHandling.Skip` attribute or configure globally).

### 4. PDF Export Service

**New files:**
- `backend/LangTeach.Api/Services/PdfExport/IPdfExportService.cs` (interface + `PdfExportMode` enum)
- `backend/LangTeach.Api/Services/PdfExport/PdfLessonData.cs` (flat DTO: lesson metadata + sections + blocks)
- `backend/LangTeach.Api/Services/PdfExport/PdfExportService.cs` (QuestPDF Document.Create)

Document structure:
- **Header:** Title, metadata (teacher mode: language, CEFR, topic, date, student name; student mode: title, topic, date only)
- **Sections:** Iterate in order. Teacher mode includes section type heading, timing, Notes. Student mode omits Notes/timing.
- **Content blocks:** Switch on `ContentBlockType`, deserialize JSON, render per type:

| Block Type | Teacher | Student |
|---|---|---|
| Vocabulary | Table: word, definition, example, translation | Table: no translation column |
| Grammar | Title, explanation, examples, commonMistakes | No commonMistakes |
| Exercises | Fill-in-blank with answers, MC with answer marked | Blanks only, no answers |
| Conversation | Full scenarios | Same |
| Reading | Passage + questions with answers | Questions without answers |
| Homework | Full tasks | Same |
| LessonPlan | Full plan | Omitted entirely |

- **Footer:** "Created with LangTeach", page number

### 5. Export Endpoint

**Modified:** `backend/LangTeach.Api/Controllers/LessonsController.cs`

```
GET /api/lessons/{lessonId}/export/pdf?mode=teacher|student
```

Follows the `/study` endpoint auth/load pattern but differs in two ways:
1. Must `.Include(l => l.Student)` to get the student name for the PDF header.
2. Does NOT use `TryParseContent()` (which returns raw `JsonElement`). Instead, reads `EditedContent ?? GeneratedContent` as raw string, strips fences via a shared `ContentJsonHelper.StripFences()` utility (extracted from `LessonContentBlocksController.TryParseContent`), then deserializes into the typed C# records from Step 2.

Returns `File(bytes, "application/pdf", filename)`. Returns 404 for missing or other-teacher's lessons.

### 6. Frontend API Function

**New file:** `frontend/src/api/export.ts`

`exportLessonPdf(lessonId, mode)` calls the endpoint with `responseType: 'blob'`, triggers browser download via temporary anchor element. Note: axios `client.ts` has `baseURL: '/api'`, so the URL must be `/lessons/${lessonId}/export/pdf` (without `/api` prefix).

### 7. Export Button Component

**New file:** `frontend/src/components/lesson/ExportButton.tsx`

Button with Popover dropdown (reuse existing `@/components/ui/popover`), two options: "Teacher Copy" and "Student Handout". Uses `Download` icon from lucide-react. Shows loading state during download.

### 8. Integrate into Lesson Editor

**Modified:** `frontend/src/pages/LessonEditor.tsx`

Add `<ExportButton lessonId={id} />` in the top bar actions area (around line 314, before `FullLessonGenerateButton`).

### 9. Backend Tests

**New file:** `backend/LangTeach.Api.Tests/Controllers/ExportEndpointTests.cs`

Integration tests via `AuthenticatedWebAppFactory`:
- Teacher mode returns 200 + `application/pdf` content type + bytes starting with `%PDF`
- Student mode returns 200 + valid PDF
- Non-existent lesson returns 404
- Other teacher's lesson returns 404

### 10. Frontend Unit Test

**New file:** `frontend/src/components/lesson/ExportButton.test.tsx`

Vitest + RTL: renders button, dropdown opens on click, calls API with correct mode, shows loading state.

### 11. Dockerfile Update

**Modified:** `backend/Dockerfile`

Add `libfontconfig1` and `libfreetype6` to the `apt-get install` line in the runtime stage so QuestPDF's SkiaSharp native rendering works in the container.

### 12. E2E Test

**New file:** `e2e/tests/pdf-export.spec.ts`

Playwright mock-auth test: navigate to lesson editor, click export, intercept download, verify `.pdf` file with non-zero size.

## Risks

- **QuestPDF in Docker:** Needs SkiaSharp native libs. Add `libfontconfig1` and `libfreetype6` to the Dockerfile's `apt-get install` line in the runtime stage.
- **Font fallback:** Use QuestPDF built-in fallback fonts if system fonts are missing.

## Key Files

| Purpose | Path |
|---|---|
| Existing study endpoint (pattern to follow) | `backend/LangTeach.Api/Controllers/LessonsController.cs:169-213` |
| Fence-stripping logic to extract | `backend/LangTeach.Api/Controllers/LessonContentBlocksController.cs:35-49` |
| Content type shapes (mirror to C#) | `frontend/src/types/contentTypes.ts` |
| Lesson editor toolbar (add button) | `frontend/src/pages/LessonEditor.tsx:~314` |
| Test pattern | `backend/LangTeach.Api.Tests/Controllers/StudyEndpointTests.cs` |
| Content registry (reference) | `frontend/src/components/lesson/contentRegistry.tsx` |
| Axios client (baseURL is `/api`) | `frontend/src/api/client.ts` |
| Dockerfile (add native libs) | `backend/Dockerfile` |

## Verification

1. `dotnet build` with zero warnings
2. `dotnet test` with all tests passing (existing + new export tests)
3. `npm run build` with zero errors
4. `npm test` with all tests passing (existing + ExportButton test)
5. E2E: `npx playwright test pdf-export` passes
6. Manual: open lesson editor, click Export > Teacher Copy, verify PDF downloads with correct content; repeat for Student Handout
