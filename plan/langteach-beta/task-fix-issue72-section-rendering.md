# Fix: Lesson Editor renders all 5 sections regardless of template (Issue #72)

## Context

The `LessonEditor` always renders all 5 section types from a hardcoded `SECTION_ORDER` array, regardless of which sections the lesson actually has. This makes all lessons look identical regardless of template, confuses teachers with empty sections (no Generate button), and undermines the template system before the demo.

**Scope: Bug fix + add/remove section UI** (not reorder). Reordering is unnecessary because the pedagogical sequence (WarmUp -> WrapUp) is standard and teachers rarely change it. Add/remove makes templates meaningful and gives teachers visible control.

## Changes

### 1. Backend: Upsert sections instead of replace-all

**File:** `backend/LangTeach.Api/Services/LessonService.cs` (line 192, `UpdateSectionsAsync`)

The current implementation does `RemoveRange` + `AddRange` with new GUIDs on every call. This regenerates all section IDs, which orphans content blocks (content blocks have a nullable FK to `LessonSectionId` with `NoAction` delete behavior). This is a pre-existing latent bug, but add/remove sections makes it worse.

**Fix:** Change to upsert logic:
- Match incoming sections to existing ones by `SectionType`
- For matched sections: update `Notes` and `OrderIndex` in place (preserve the existing `Id`)
- For new sections (type not in DB): create with `Guid.NewGuid()`
- For removed sections (type in DB but not in request): delete from DB AND delete associated content blocks first (since FK is `NoAction`, must clean up manually)

### 2. Fix section rendering to use lesson data (bug fix)

**File:** `frontend/src/pages/LessonEditor.tsx`

- Replace `SECTION_ORDER.map(...)` at line 590 with iteration over `lesson.sections` sorted by `orderIndex`
- Keep `SECTION_ORDER` as a reference for ordering new sections and as display labels
- Update `initSectionNotes` (line 55) to only initialize notes for sections that exist in `lesson.sections`, not all 5
- Change `sectionNotes` state type from `Record<SectionType, string> | null` to `Partial<Record<SectionType, string>> | null` (preserves type safety while allowing subset of keys)

### 3. Fix section save to only send existing sections

**File:** `frontend/src/pages/LessonEditor.tsx`

- Update `doUpdateSections` mutation (line 151) to build the payload from `lesson.sections` (map existing sections, merge with current notes from `sectionNotes` state), not from `SECTION_ORDER`
- Update mutation input type to match new `Partial<Record<SectionType, string>>` shape

### 4. Add "Add Section" UI

**File:** `frontend/src/pages/LessonEditor.tsx`

- Below the last section card, add an "+ Add Section" dropdown (using existing `Select` component from shadcn)
- Dropdown shows only section types NOT already present in the lesson
- **Automatic positional insertion (no reorder needed):** When a type is selected, it is inserted at its canonical position in the PPP sequence (WarmUp=0, Presentation=1, Practice=2, Production=3, WrapUp=4). All `orderIndex` values are recalculated from `SECTION_ORDER` so sections always maintain correct pedagogical order. Example: adding Presentation to a Conversation lesson (WarmUp, Practice, Production, WrapUp) produces (WarmUp, **Presentation**, Practice, Production, WrapUp), not appended at the end.
- Call `updateSections` API with the recalculated set; invalidate the lesson query to refresh
- Hide the dropdown when all 5 section types are present

### 5. Add "Remove Section" button per section

**File:** `frontend/src/pages/LessonEditor.tsx`

- Add a trash/remove icon button in each section's `CardHeader` (next to the Generate button)
- Requires confirmation (use existing `AlertDialog`)
- On confirm: call `updateSections` API with the section removed
- If the section has content blocks, warn the teacher: "This section has generated content that will be permanently removed."
- Do not allow removing the last section (disable button if only 1 section remains)

### 6. Unit tests

**File:** `frontend/src/pages/LessonEditor.test.tsx` (existing file)

- Update existing `mockLesson` or add new test fixtures with fewer than 5 sections
- Test: lesson with 3 sections only renders 3 section cards (not 5)
- Test: "Add Section" dropdown only shows missing section types
- Test: removing a section calls the API without it
- Test: cannot remove last section (button disabled)
- Ensure `updateSections` mock returns a proper `Lesson` object (current mock returns `{}`)

**File:** `backend/LangTeach.Api.Tests/` (new test for upsert logic)

- Test: updating notes preserves section IDs
- Test: adding a new section type creates it without affecting existing section IDs
- Test: removing a section type deletes it and its content blocks

### 7. E2E test

**File:** `e2e/tests/lesson-sections.spec.ts` (new, mock-auth project)

- Create a lesson from the Conversation template (4 sections: WarmUp, Practice, Production, WrapUp, no Presentation)
- Verify only 4 section cards are rendered
- Add the missing Presentation section via the dropdown
- Verify 5 sections now shown
- Remove one section
- Verify section count decreases

## Files to modify

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Services/LessonService.cs` | Upsert logic in `UpdateSectionsAsync` |
| `backend/LangTeach.Api.Tests/Controllers/LessonSectionsTests.cs` | Backend upsert tests |
| `frontend/src/pages/LessonEditor.tsx` | Core fix + add/remove UI |
| `frontend/src/pages/LessonEditor.test.tsx` | Unit tests |
| `e2e/tests/lesson-sections.spec.ts` | E2E test |

## Existing e2e test impact

Some existing e2e tests create lessons and interact with sections. After this change, lessons from templates with fewer than 5 sections will only show the template's sections. Verify these tests still pass:
- `e2e/tests/lessons.spec.ts`
- `e2e/tests/full-lesson-generation.spec.ts`
- `e2e/tests/lesson-ai-generate.spec.ts`

## Verification

1. `cd backend && dotnet build` (zero warnings, zero errors)
2. `cd backend && dotnet test` (all tests pass, including new upsert tests)
3. `cd frontend && npm run build` (zero errors)
4. `cd frontend && npm test` (all unit tests pass)
5. **E2E tests may not work from the worktree** (Docker/Playwright paths may not resolve correctly). Before running e2e tests, exit the worktree back to the main repo, cherry-pick or merge changes, then run `docker compose up -d` and `npx playwright test --project=mock-auth`. Notify the user and wait for approval before leaving the worktree.
6. Manual: create a Conversation lesson (4 sections), verify no empty Presentation card, add Presentation via dropdown, remove it again
