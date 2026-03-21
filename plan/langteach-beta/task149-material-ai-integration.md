# Task 149: Material Upload - AI generation references uploaded files

## Problem
Materials (PDFs, images) can be uploaded to lesson sections (#148), but the AI generation ignores them. Teachers want to say "adapt this worksheet for a B1 student" and have the AI use the uploaded file as source material.

## Approach
When generating content, the backend automatically loads materials attached to the lesson's sections and includes them as multi-modal content in the Claude API request. The teacher uses the existing `direction` field to indicate how to use the materials (e.g., "adapt this worksheet", "use this vocabulary list"). No new frontend UI is needed since materials are already uploaded via the MaterialUpload component and the direction field already exists.

## Implementation Steps

### Step 1: Add blob download to IBlobStorageService
- Add `Task<Stream> DownloadAsync(string blobPath, CancellationToken ct)` to `IBlobStorageService`
- Implement in `BlobStorageService` using `BlobClient.OpenReadAsync()`
- Implement in `InMemoryBlobStorageService`: return `new MemoryStream(_blobs[blobPath])`, throw `InvalidOperationException` if blob path not found

### Step 2: Add multi-modal support to ClaudeRequest/ClaudeApiClient
- Add `ContentAttachment` record in `IClaudeClient.cs`: `(string MediaType, byte[] Data, string FileName)`
- Add optional param to `ClaudeRequest`: `IReadOnlyList<ContentAttachment>? Attachments = null` (after `MaxTokens`)
- Modify `ClaudeApiClient.BuildRequestBody()` (currently `private static`, returns anonymous type):
  - When no attachments: keep current behavior (`content = request.UserPrompt` as string)
  - When attachments present: build `content` as `List<object>` containing attachment blocks + text block
  - Images (jpeg/png/webp): `{ type = "image", source = new { type = "base64", media_type = "...", data = "..." } }`
  - PDFs: `{ type = "document", source = new { type = "base64", media_type = "application/pdf", data = "..." } }`
  - Final element: `{ type = "text", text = request.UserPrompt }`
  - The anonymous-type approach works because `System.Text.Json` serializes anonymous objects by property name. The `content` field type changes from `string` to `List<object>`, both serialize correctly. Build two separate anonymous objects and return the right one:
    ```
    if (attachments exist)
        return new { model, max_tokens, system, stream, messages = new[] { new { role = "user", content = contentArray } } };
    else
        return new { model, max_tokens, system, stream, messages = new[] { new { role = "user", content = request.UserPrompt } } };
    ```

### Step 3: Add material loading to IMaterialService
- Add `Task<List<MaterialContent>> GetMaterialContentsAsync(Guid teacherId, Guid lessonId, CancellationToken ct)` to `IMaterialService`
- `MaterialContent` record: `(string FileName, string ContentType, byte[] Data)` (defined in same file or `DTOs/`)
- Implementation in `MaterialService`:
  - Query: `.Where(m => m.LessonSection.LessonId == lessonId && m.LessonSection.Lesson.TeacherId == teacherId && !m.LessonSection.Lesson.IsDeleted)` (ownership + soft-delete check)
  - Download each blob via `_blobStorage.DownloadAsync()`, read into `byte[]`
  - Cap total size at 20MB. Accumulate `SizeBytes` and stop adding once cap is reached, log a warning for skipped materials
  - Return list ordered by `CreatedAt`

### Step 4: Wire materials into GenerateController
- Add `IMaterialService _materialService` dependency to constructor (already registered in DI via `Program.cs`)
- In both `Stream()` and `Generate()` methods, after loading the lesson and building `GenerationContext`:
  1. Call `var materials = await _materialService.GetMaterialContentsAsync(teacherId, lesson.Id, ct)`
  2. Convert to `ContentAttachment[]`: `materials.Select(m => new ContentAttachment(m.ContentType, m.Data, m.FileName)).ToArray()`
  3. Get `ClaudeRequest` from `PromptService` as before: `var claudeRequest = buildPrompt(_promptService, ctx)`
  4. **Attach materials using record `with`**: `claudeRequest = claudeRequest with { Attachments = attachments }` (only if non-empty)
- Add `MaterialFileNames` to `GenerationContext` so `PromptService` can reference file names in the system prompt (see Step 5)
- Haiku model limitation: Claude Haiku does not support PDF document blocks. When materials contain PDFs and the prompt uses Haiku (vocabulary, exercises, conversation), upgrade the model to Sonnet: `claudeRequest = claudeRequest with { Model = ClaudeModel.Sonnet }`. This is acceptable because materials imply more complex generation that benefits from Sonnet. Images work fine on Haiku, no upgrade needed for image-only materials.

### Step 5: Update PromptService to reference materials
- Add `string[]? MaterialFileNames = null` to `GenerationContext` as the last parameter (after `Direction`), preserving default values so existing callers don't break
- In `BuildSystemPrompt()`, when `MaterialFileNames` is non-null and non-empty:
  ```
  sb.AppendLine();
  sb.AppendLine("The teacher has uploaded the following reference materials (attached as files):");
  foreach (var name in ctx.MaterialFileNames)
      sb.AppendLine($"- {Sanitize(name)}");
  sb.AppendLine("Use these materials as source/inspiration for the generated content. Adapt, reference, or build upon them as appropriate for the student's level.");
  ```

### Step 6: Unit tests
- **PromptServiceTests** (existing file `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`):
  - Add test: system prompt includes material file names when `MaterialFileNames` is provided
  - Add test: system prompt omits material block when `MaterialFileNames` is null
  - Add test: system prompt omits material block when `MaterialFileNames` is empty array
- **GenerateControllerTests** (existing file `backend/LangTeach.Api.Tests/Controllers/GenerateControllerTests.cs`):
  - Existing tests should continue passing (IMaterialService is already in DI via Program.cs, InMemoryBlobStorageService is registered)
  - Add test: seed a lesson with materials, generate vocabulary, verify 200 response (integration test, validates the full flow)
- **ClaudeApiClient**: `BuildRequestBody` is `private static`. Test indirectly via the existing integration pattern (FakeClaudeClient), or make it `internal` with `[InternalsVisibleTo]`. Prefer indirect testing: add a test that verifies `StreamAsync`/`CompleteAsync` produce a valid HTTP request body when attachments are present (requires a mock HTTP handler). Keep this lightweight; the serialization logic is straightforward.
- **MaterialServiceTests** (new file `backend/LangTeach.Api.Tests/Services/MaterialServiceTests.cs`):
  - Test `GetMaterialContentsAsync` returns materials for the lesson
  - Test `GetMaterialContentsAsync` respects teacher ownership (returns empty for wrong teacher)
  - Test `GetMaterialContentsAsync` respects size cap (skips materials beyond 20MB)

### Step 7: E2E test
- Upload a material to a section, then generate content with a direction referencing the material
- Verify the generation completes (content is returned, not empty)
- Note: e2e uses FakeClaudeClient so we can only verify the request completes, not that the AI output is influenced. The unit tests on prompt construction cover the integration correctness.

## Key Design Decisions
- **Automatic inclusion**: Materials are automatically included when they exist on the lesson, no explicit "use materials" toggle needed. The teacher's direction field provides the "how to use" instruction.
- **All sections' materials**: Load materials from all sections of the lesson, not just the section being generated. A vocabulary list uploaded to Warm Up should inform Grammar generation too.
- **Size cap**: 20MB total across all materials to prevent excessive API costs. Log a warning if materials are truncated.
- **No text extraction**: Send PDFs and images as native Claude content blocks (base64). Claude handles OCR/reading natively. No need for separate text extraction libraries.
- **Attachment flow**: PromptService builds the ClaudeRequest as before (system prompt + user prompt). The controller then attaches materials using `with { Attachments = ... }`. This keeps PromptService decoupled from raw file data while still letting it reference material file names in the system prompt via `GenerationContext.MaterialFileNames`.
- **Haiku PDF upgrade**: When PDFs are present, Haiku prompts auto-upgrade to Sonnet. Image-only materials stay on Haiku. This avoids API errors while keeping costs low for the common case.

## Files to modify
- `backend/LangTeach.Api/Services/IBlobStorageService.cs` (add DownloadAsync)
- `backend/LangTeach.Api/Services/BlobStorageService.cs` (implement DownloadAsync)
- `backend/LangTeach.Api.Tests/Helpers/InMemoryBlobStorageService.cs` (implement DownloadAsync)
- `backend/LangTeach.Api/AI/IClaudeClient.cs` (add ContentAttachment, update ClaudeRequest)
- `backend/LangTeach.Api/AI/ClaudeApiClient.cs` (update BuildRequestBody)
- `backend/LangTeach.Api/AI/IPromptService.cs` (update GenerationContext)
- `backend/LangTeach.Api/AI/PromptService.cs` (update BuildSystemPrompt)
- `backend/LangTeach.Api/Services/IMaterialService.cs` (add GetMaterialContentsAsync, MaterialContent record)
- `backend/LangTeach.Api/Services/MaterialService.cs` (implement GetMaterialContentsAsync)
- `backend/LangTeach.Api/Controllers/GenerateController.cs` (wire materials, attach to ClaudeRequest, Haiku upgrade)
- `backend/LangTeach.Api.Tests/Services/MaterialServiceTests.cs` (new file)

## Out of scope
- New frontend UI (no `area:frontend` label)
- OCR/text extraction libraries
- Caching material content between generation calls
