# Task 380: Fix Exam Prep Template Structural Issues

## Problem Summary

Three bugs cause the exam-prep template to generate wrong content:

1. **CQ-4**: Production generates 3 oral conversation scenarios instead of written exam tasks
2. **GAP-3**: No timed practice guidance in any section
3. **NEW-3**: WarmUp generates 3 full conversation scenarios instead of an exam briefing

## Root Cause

**Bug A - GenerateController.cs:159-164**: `templateName` is only fetched from the DB when `blockTypeEnum == ContentBlockType.LessonPlan`. For all other content types (conversation, exercises, free-text), `ctx.TemplateName` is always `null`. Template-specific guidance never reaches section prompts.

**Bug B - FullLessonGenerateButton.tsx:22-28**: `SECTION_TASK_MAP` hard-codes `'conversation'` for WarmUp and Production regardless of template. For exam-prep, these should be `'free-text'`.

**Bug C - FreeTextUserPrompt / ExercisesUserPrompt**: Even when `ctx.TemplateName` is set (after Bug A fix), neither prompt builder injects template override guidance. The exam-prep section requirements ("exam briefing", "timed written practice", "written exam task") are never sent to the AI.

## Fix Plan

### 1. GenerateController.cs
Remove the `blockTypeEnum == ContentBlockType.LessonPlan &&` condition so templateName is always fetched.

### 2. PromptService.cs
Add `BuildTemplateGuidanceBlock(string? templateName, string? sectionType, string cefrLevel)` helper that:
- Looks up template override entry via `_pedagogy.GetTemplateOverrideByName(templateName)`
- Maps PascalCase sectionType ("WarmUp") to camelCase key ("warmUp") for template lookup
- Returns formatted block with `SECTION REQUIREMENT: ...` and `IMPORTANT: ...` (notes) and `Level note: ...`

Apply this helper to:
- `FreeTextUserPrompt` (handles WarmUp and Production for exam-prep)
- `ExercisesUserPrompt` (handles Practice for exam-prep - GAP-3)

### 3. LessonDto.cs + LessonService.cs
Add `string? TemplateName` to `LessonDto`. In `LessonService`, add `.Include(l => l.Template)` to `GetByIdAsync` and map `l.Template?.Name` in `MapToDto`.

### 4. Frontend: lessons.ts
Add `templateName: string | null` to `Lesson` interface.

### 5. Frontend: LessonEditor.tsx
Pass `lesson.templateName` to `FullLessonGenerateButton.lessonContext`.

### 6. Frontend: FullLessonGenerateButton.tsx
- Add `templateName?: string | null` to `lessonContext` interface
- Add `EXAM_PREP_SECTION_TASK_MAP` with WarmUp='free-text', Production='free-text', WrapUp='free-text'
- Use exam-prep map when `lessonContext.templateName?.toLowerCase() === 'exam-prep'`

### 7. Tests
- `FullLessonGenerateButton.test.tsx`: Add test verifying exam-prep uses 'free-text' for WarmUp/Production/WrapUp
- `PromptServiceTests.cs`: Add tests verifying FreeText and Exercises prompts include template guidance for exam-prep

## Acceptance Criteria Check
- AC1: Production = free-text content with time limits + word counts (not conversation scenarios)
- AC2: Practice exercises include timed constraint from template notes
- AC3: WarmUp = free-text exam briefing (not conversation scenarios)
- AC4: Other personas unaffected (templateName is null for non-template lessons, no change)
