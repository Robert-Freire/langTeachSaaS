# Task 148: Material Upload - File Storage, UI, and Preview

**Issue:** #148
**Priority:** P1:must
**Milestone:** Phase 2A: Teacher Workflow

## Overview

Teachers need to attach files (PDFs, images) to lesson sections. This task adds Azure Blob Storage integration, a new `Material` entity, API endpoints, and lesson editor UI for upload/preview/delete.

## Architecture Decisions

### Storage Strategy
- **Dev/E2E:** Azurite (Azure Storage emulator) running in Docker
- **Production:** Azure Blob Storage with connection-string auth (stored in Key Vault). Connection string keeps dev/prod code path identical and avoids managed-identity complexity for now.
- **Tenant isolation:** Path prefix `{teacherId}/{lessonId}/{materialId}_{filename}`
- **Container name:** `materials`

### Entity Design
- New `Material` entity linked to `LessonSection` (a section can have multiple materials)
- Fields: Id, LessonSectionId, FileName, ContentType, SizeBytes, BlobPath, CreatedAt
- String properties use `= string.Empty` initializers to match existing model pattern (e.g., `LessonSection.SectionType`)
- Cascade delete: section deletion removes material DB rows. Blob cleanup is handled explicitly (see Blob Cleanup Strategy).

### API Design
- `POST /api/lessons/{lessonId}/sections/{sectionId}/materials` (multipart upload)
- `GET /api/lessons/{lessonId}/sections/{sectionId}/materials` (list)
- `GET /api/lessons/{lessonId}/sections/{sectionId}/materials/{id}` (download via SAS URL redirect)
- `DELETE /api/lessons/{lessonId}/sections/{sectionId}/materials/{id}`
- Validation: max 10MB, allowed types: pdf, jpg, png, webp
- Upload endpoint uses `[RequestSizeLimit(10_485_760)]` to enforce at framework level

### Blob Cleanup Strategy
- **Individual delete:** `MaterialService.DeleteAsync` removes both the DB row and the blob.
- **Section removal via `UpdateSectionsAsync`:** `LessonService.UpdateSectionsAsync` already physically removes sections (`_db.LessonSections.RemoveRange`) and cleans up orphaned content blocks. This method must be extended to also call `IMaterialService.DeleteBlobsForSectionsAsync(removedSectionIds)` before removing the sections, so blobs are cleaned up before EF removes the DB rows.
- **Lesson soft-delete:** `LessonService.DeleteAsync` sets `IsDeleted = true` (soft delete). Sections and materials remain in the DB. No blob cleanup at soft-delete time. A future purge/hard-delete flow can handle orphaned blobs if needed.

### Preview URL Strategy
Preview URLs are generated at the controller/service boundary, not inside `MapSectionToDto`. The `MaterialsController` download endpoint returns a redirect to a SAS URL. For materials included in the lesson detail response, `MaterialService.EnrichWithPreviewUrls(List<MaterialDto>)` generates SAS URLs and sets them on the DTOs. This keeps `MapSectionToDto` static and avoids injecting `IBlobStorageService` into `LessonService`.

Flow:
1. `LessonService.GetByIdAsync` eagerly loads materials and maps sections to DTOs (materials mapped without preview URLs)
2. Controller calls `MaterialService.EnrichWithPreviewUrls` on the section DTOs before returning
3. Preview URLs are short-lived SAS URLs pointing to blob storage

## Implementation Steps

### Step 1: Infrastructure (Azurite + Bicep)

1. **Add Azurite to docker-compose.yml and docker-compose.e2e.yml**
   - Image: `mcr.microsoft.com/azure-storage/azurite`
   - Dev: expose port 10000 (blob) to host, E2E: internal only (API connects via Docker service name `azurite`)
   - Add `AzureBlobStorage__ConnectionString` env var to API service: `DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8...;BlobEndpoint=http://azurite:10000/devstoreaccount1;`
   - Note: the hostname in the connection string must be the Docker service name (`azurite`), not `localhost`

2. **Extend infra/modules/storage.bicep**
   - Add blob service and `materials` container
   - Add `appPrincipalId` param (passed from `containerApp.outputs.principalId` via `main.bicep`)
   - Add Storage Blob Data Contributor role assignment using the new param
   - Add output for storage account connection string (listKeys)

3. **Update infra/main.bicep**
   - Pass `appPrincipalId: containerApp.outputs.principalId` to the storage module
   - Pass storage connection string output to keyvault module

4. **Extend infra/modules/keyvault.bicep**
   - Accept `storageConnectionString` param
   - Add `AzureBlobStorage--ConnectionString` secret

### Step 2: Backend - Entity & Migration

1. **Create `Material` model** in `Data/Models/Material.cs`
   ```csharp
   public class Material {
       public Guid Id { get; set; }
       public Guid LessonSectionId { get; set; }
       public string FileName { get; set; } = string.Empty;
       public string ContentType { get; set; } = string.Empty;
       public long SizeBytes { get; set; }
       public string BlobPath { get; set; } = string.Empty;
       public DateTime CreatedAt { get; set; }
       public LessonSection LessonSection { get; set; } = null!;
   }
   ```

2. **Update `LessonSection`** to add `ICollection<Material> Materials { get; set; } = new List<Material>();` navigation property

3. **Update `AppDbContext`** with `DbSet<Material>` and configuration in `OnModelCreating`:
   - Cascade delete from LessonSection
   - Index on LessonSectionId

4. **Add EF migration** `AddMaterials`

### Step 3: Backend - Blob Service

1. **Add NuGet package** `Azure.Storage.Blobs`

2. **Create `IBlobStorageService` / `BlobStorageService`**
   - `UploadAsync(Stream stream, string blobPath, string contentType)` returns URI
   - `DeleteAsync(string blobPath)`
   - `GetDownloadUrlAsync(string blobPath)` returns SAS URL
   - Container auto-creation on startup

3. **Register in Program.cs** with connection string from config (`AzureBlobStorage:ConnectionString`)

### Step 4: Backend - Material Service & Controller

1. **Create `IMaterialService` / `MaterialService`**
   - `UploadAsync(Guid teacherId, Guid lessonId, Guid sectionId, IFormFile file)`
     - Validate ownership, file size, content type
     - Upload to blob storage, create Material entity
   - `ListAsync(Guid teacherId, Guid lessonId, Guid sectionId)`
   - `GetDownloadUrlAsync(Guid teacherId, Guid materialId)`
   - `DeleteAsync(Guid teacherId, Guid materialId)` (delete blob + entity)
   - `DeleteBlobsForSectionsAsync(IEnumerable<Guid> sectionIds)` (bulk delete blobs for given sections, called from `LessonService` before section removal)
   - `EnrichWithPreviewUrls(List<LessonSectionDto> sections)` (generates SAS URLs for all materials in the section DTOs)

2. **Create `MaterialsController`**
   - Routes nested under lessons: `api/lessons/{lessonId}/sections/{sectionId}/materials`
   - Standard auth checks via teacher profile lookup
   - Upload endpoint: `[RequestSizeLimit(10_485_760)]` attribute

3. **Create DTOs** in `DTOs/MaterialDtos.cs`
   - `MaterialDto(Guid Id, string FileName, string ContentType, long SizeBytes, string? PreviewUrl, DateTime CreatedAt)`
   - `PreviewUrl` is nullable (null when mapped from DB, populated by `EnrichWithPreviewUrls`)

### Step 5: Backend - Include Materials in Lesson Detail Response

1. **Update `LessonService.GetByIdAsync`** to eagerly load Materials via `.Include(l => l.Sections).ThenInclude(s => s.Materials)`. Do NOT add `.ThenInclude(s => s.Materials)` to `ListAsync` (list queries don't need materials).

2. **Inject `IMaterialService` into `LessonService`** (constructor currently takes `AppDbContext` and `ILogger<LessonService>`, add `IMaterialService`).

3. **Update `LessonSectionDto`** to add `List<MaterialDto> Materials` field. Since this is a positional record `(Guid Id, string SectionType, int OrderIndex, string? Notes)`, add the new field at the end: `(Guid Id, string SectionType, int OrderIndex, string? Notes, List<MaterialDto> Materials)`. Update all call sites:
   - `MapSectionToDto` in `LessonService` (line 344): add `s.Materials?.Select(m => new MaterialDto(m.Id, m.FileName, m.ContentType, m.SizeBytes, null, m.CreatedAt)).ToList() ?? new()`
   - Any test code constructing `LessonSectionDto` directly

4. **Update `LessonService.UpdateSectionsAsync`** (line 213-223): before `_db.LessonSections.RemoveRange(removedSections)`, call `await _materialService.DeleteBlobsForSectionsAsync(removedIds)` to clean up blobs for removed sections.

5. **Update `LessonsController.GetById`** (or wherever `GetByIdAsync` result is returned): call `await _materialService.EnrichWithPreviewUrls(lesson.Sections)` before returning, so preview URLs are populated.

### Step 6: Frontend - API Client & Types

1. **Add types and API functions** in new `api/materials.ts`
   ```ts
   interface Material { id: string; fileName: string; contentType: string; sizeBytes: number; previewUrl: string | null; createdAt: string; }
   ```
2. **Add API functions**: `uploadMaterial(lessonId, sectionId, file)`, `deleteMaterial(lessonId, sectionId, materialId)`
3. Update `LessonSection` type in `api/lessons.ts` to include `materials: Material[]`

### Step 7: Frontend - Upload UI in Lesson Editor

1. **Create `MaterialUpload` component** (`components/lesson/MaterialUpload.tsx`)
   - File picker button (simple first iteration, no drag-and-drop)
   - Shows upload progress
   - File type/size validation on client side (before upload)
   - Error messages for invalid files

2. **Create `MaterialPreview` component** (`components/lesson/MaterialPreview.tsx`)
   - Image files: thumbnail with lightbox on click
   - PDF files: PDF icon with filename (no embed, just download link)
   - Shows filename, size, delete button
   - Download button

3. **Integrate into LessonEditor.tsx**
   - Add materials area to each section card (below notes, above content blocks)
   - Use React Query mutations for upload/delete with cache invalidation

### Step 8: Frontend Unit Tests

1. **Test MaterialUpload component** (`components/lesson/MaterialUpload.test.tsx`)
   - Renders upload button
   - Rejects invalid file types with error message
   - Rejects files over 10MB with error message
   - Calls upload API on valid file selection

2. **Test MaterialPreview component** (`components/lesson/MaterialPreview.test.tsx`)
   - Renders image preview for image files
   - Renders PDF indicator for PDF files
   - Delete button calls delete API
   - Download button triggers download

### Step 9: E2E Test

1. **Create test fixture** `e2e/fixtures/test-image.png` (small sample image for upload testing)

2. **Create `e2e/tests/material-upload.spec.ts`** (happy path only)
   - Upload an image file to a section
   - Verify it displays in the editor
   - Download/preview works
   - Delete the file
   - Verify removal

### Step 10: Backend Integration Tests

1. **Create `InMemoryBlobStorageService`** in test project (`Helpers/InMemoryBlobStorageService.cs`) implementing `IBlobStorageService` with a `Dictionary<string, byte[]>` backing store
2. **Update `AuthenticatedWebAppFactory`** to replace `IBlobStorageService` registration with `InMemoryBlobStorageService`
3. **Create `MaterialsControllerTests.cs`**
   - Test material upload/download/delete flow
   - Test validation (file size, type, ownership)
   - Test section removal cleans up material blobs (via `UpdateSectionsAsync`)

## File Changes Summary

### New Files
- `backend/LangTeach.Api/Data/Models/Material.cs`
- `backend/LangTeach.Api/Services/IBlobStorageService.cs`
- `backend/LangTeach.Api/Services/BlobStorageService.cs`
- `backend/LangTeach.Api/Services/IMaterialService.cs`
- `backend/LangTeach.Api/Services/MaterialService.cs`
- `backend/LangTeach.Api/Controllers/MaterialsController.cs`
- `backend/LangTeach.Api/DTOs/MaterialDtos.cs`
- `backend/LangTeach.Api.Tests/Helpers/InMemoryBlobStorageService.cs`
- `backend/LangTeach.Api.Tests/Controllers/MaterialsControllerTests.cs`
- `frontend/src/api/materials.ts`
- `frontend/src/components/lesson/MaterialUpload.tsx`
- `frontend/src/components/lesson/MaterialPreview.tsx`
- `frontend/src/components/lesson/MaterialUpload.test.tsx`
- `frontend/src/components/lesson/MaterialPreview.test.tsx`
- `e2e/fixtures/test-image.png`
- `e2e/tests/material-upload.spec.ts`
- EF Migration file (auto-generated)

### Modified Files
- `backend/LangTeach.Api/Data/Models/LessonSection.cs` (add Materials nav prop)
- `backend/LangTeach.Api/Data/AppDbContext.cs` (add DbSet, configure Material)
- `backend/LangTeach.Api/Program.cs` (register services, blob config)
- `backend/LangTeach.Api/LangTeach.Api.csproj` (add Azure.Storage.Blobs)
- `backend/LangTeach.Api/Services/LessonService.cs` (inject IMaterialService, include materials in GetByIdAsync, blob cleanup in UpdateSectionsAsync)
- `backend/LangTeach.Api/DTOs/LessonSectionDto.cs` (add Materials field to positional record)
- `backend/LangTeach.Api/Controllers/LessonsController.cs` (call EnrichWithPreviewUrls after GetByIdAsync)
- `backend/LangTeach.Api.Tests/Fixtures/AuthenticatedWebAppFactory.cs` (register InMemoryBlobStorageService)
- `frontend/src/api/lessons.ts` (add materials field to LessonSection type)
- `frontend/src/pages/LessonEditor.tsx` (integrate MaterialUpload/Preview)
- `frontend/src/pages/LessonEditor.test.tsx` (add materials to mock section data)
- `docker-compose.yml` (add Azurite service)
- `docker-compose.e2e.yml` (add Azurite service)
- `infra/main.bicep` (pass appPrincipalId and storage connection string)
- `infra/modules/storage.bicep` (add appPrincipalId param, blob container, RBAC, outputs)
- `infra/modules/keyvault.bicep` (add storageConnectionString param and secret)

## Risks & Considerations

- **Azurite compatibility:** Azurite supports most Blob Storage APIs. Using connection-string auth for both dev and prod keeps the code path consistent.
- **Blob cleanup on section removal:** Handled explicitly in `LessonService.UpdateSectionsAsync` by calling `IMaterialService.DeleteBlobsForSectionsAsync` before `RemoveRange`. If blob deletion fails, the section removal is aborted (no orphaned blobs).
- **Soft-deleted lessons:** Blobs remain when a lesson is soft-deleted. This is acceptable for now. A future purge job can clean up blobs for permanently deleted lessons.
- **Preview for PDFs:** Simple PDF icon with download link for v1. Browser-native embed can be added as polish.
- **CORS for blob access:** The API generates SAS URLs that point directly to blob storage. In dev (Azurite on localhost:10000), the browser can fetch these directly. No CORS issues since they're direct GET requests.
- **Request size limit:** Enforced at framework level with `[RequestSizeLimit]` attribute, plus application-level validation for the 10MB cap.
- **`LessonSectionDto` positional record change:** Adding `Materials` field to the end of the positional record requires updating all existing call sites that construct it (primarily `MapSectionToDto` and test code).
