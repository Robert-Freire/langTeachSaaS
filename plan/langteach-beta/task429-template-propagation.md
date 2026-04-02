# Task 429: Fix template type not propagating to block-level generation

## Problem

Full lesson generation ignores template type when selecting content types per section:

1. **R&C template (Carmen B2)**: `FullLessonGenerateButton` uses `SECTION_TASK_MAP.Presentation = 'grammar'` for all templates, so Presentation generates a grammar block instead of a reading passage. Practice then generates comprehension exercises referencing a phantom reading text.

2. **Writing Skills template (Isabel B1)**: `SECTION_TASK_MAP.Production = 'conversation'`, so Production generates a conversation instead of a guided-writing task.

3. **Exam Prep template (Ana B2)**: `EXAM_PREP_SECTION_TASK_MAP` maps WarmUp/WrapUp/Production to `free-text`, but WarmUp and WrapUp section profiles only allow `conversation`, causing HTTP 400 for those sections.

Secondary: Several `PromptService.BuildRequest` calls pass `null` for the template param, producing misleading `template=(none)` in debug logs even though user prompt methods correctly use `ctx.TemplateName`.

## Root cause

`FullLessonGenerateButton.tsx` only has one special-case map (`EXAM_PREP_SECTION_TASK_MAP`) and that map itself contains invalid content types for WarmUp/WrapUp (section profiles only allow `conversation`).

## Fix

### 1. `frontend/src/components/lesson/FullLessonGenerateButton.tsx`

- Fix `EXAM_PREP_SECTION_TASK_MAP`:
  - WarmUp: `free-text` -> `conversation` (WarmUp only allows `conversation`)
  - Production: `free-text` -> `exercises` (Exam Prep prefers `exercises`; allowed at B1+)
  - WrapUp: `free-text` -> `conversation` (WrapUp only allows `conversation`)

- Add `READING_COMPREHENSION_SECTION_TASK_MAP`:
  - Presentation: `reading` (was `grammar`)
  - All others same as `SECTION_TASK_MAP`

- Add `WRITING_SKILLS_SECTION_TASK_MAP`:
  - Production: `guided-writing` (was `conversation`)
  - All others same as `SECTION_TASK_MAP`

- Update template selection (lines 110-112):
  ```ts
  const tName = lessonContext.templateName?.toLowerCase() ?? ''
  const taskMap =
    tName === 'exam prep' ? EXAM_PREP_SECTION_TASK_MAP :
    tName === 'reading & comprehension' ? READING_COMPREHENSION_SECTION_TASK_MAP :
    tName === 'writing skills' ? WRITING_SKILLS_SECTION_TASK_MAP :
    SECTION_TASK_MAP
  ```

### 2. `backend/LangTeach.Api/AI/PromptService.cs`

Fix `BuildRequest` calls that pass `null` for template to pass `ctx.TemplateName` instead, so debug logs accurately show the active template:
- `BuildVocabularyPrompt`, `BuildGrammarPrompt`, `BuildExercisesPrompt`, `BuildConversationPrompt`, `BuildReadingPrompt`, `BuildHomeworkPrompt`, `BuildFreeTextPrompt`, `BuildErrorCorrectionPrompt`

No behavioral change - prompts already use `ctx.TemplateName` directly in user prompt methods.

## Tests

### Frontend (`FullLessonGenerateButton.test.tsx`)
- Add test: R&C template uses `reading` for Presentation and `exercises` for Practice
- Add test: Writing Skills template uses `guided-writing` for Production
- Add test: Exam Prep template uses `conversation` for WarmUp/WrapUp and `exercises` for Production

### Backend (`PromptServiceTests.cs`)
- Add test cases for R&C template context to verify `template=` log param matches `ctx.TemplateName`
- These can be simple: verify `BuildRequest` receives the expected template name

## What is NOT changed

- `GenerateController.cs` already correctly resolves `lesson.TemplateId -> templateName` and passes it to `GenerationContext`.
- `PromptService` user prompt methods (`ExercisesUserPrompt`, `ReadingUserPrompt`, etc.) already correctly use `ctx.TemplateName` for template guidance and scope constraints.
- `SectionProfileService.IsAllowed` is NOT changed - the content types in the task maps are selected to be within the section profiles' allowed lists.

## Affected files

- `frontend/src/components/lesson/FullLessonGenerateButton.tsx`
- `frontend/src/components/lesson/FullLessonGenerateButton.test.tsx`
- `backend/LangTeach.Api/AI/PromptService.cs`
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`
