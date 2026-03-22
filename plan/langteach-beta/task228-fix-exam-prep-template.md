# Task 228: Fix Exam Prep Template

**Issue:** #228
**Branch:** worktree-task-t228-fix-exam-prep-template
**Sprint:** Curriculum & Personalization

## Problem

Teacher QA (2026-03-22) found two issues with Exam Prep lessons (Ana Exam, DELE B2):
1. Production section generates oral role-play (travel agency conversation) instead of written exam-format tasks
2. No time limit guidance anywhere in the lesson

## Approach

Same pattern as #227 (R&C template): add an `if (string.Equals(ctx.TemplateName, "Exam Prep", ...))` block in `LessonPlanUserPrompt` inside `PromptService.cs`. The block appends exam-prep-specific mandatory requirements.

Template name in DB: `"Exam Prep"` (from SeedData.cs line 70).

## Files to Change

- `backend/LangTeach.Api/AI/PromptService.cs` - add Exam Prep template block to `LessonPlanUserPrompt`
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` - add 3 unit tests

## Prompt Requirements

```
EXAM PREP TEMPLATE REQUIREMENTS (mandatory):
- warmUp: review the exam format, the target task type, and the scoring criteria.
  Briefly discuss what the examiner is looking for. No casual icebreakers.
- presentation: teach the strategy for the target exam task (e.g. essay structure,
  formal letter conventions, skimming for gist). Use authentic exam-task examples.
- practice: timed written practice under exam conditions. Include an explicit time
  limit (e.g. "15 minutes"). Use written task types only (no oral role-play).
  Debrief answers with reference to the mark scheme.
- production: a full written exam task the student attempts independently.
  Specify a time limit (in minutes) and a target word count. Task type must match
  the target exam format: opinion essay, formal letter, short report, or similar
  written genre. Do NOT use oral role-play or conversation activities.
- wrapUp: student self-assesses against the mark scheme criteria; identify one
  strength and one area to improve before the next session.
All five sections are required. Do not collapse or omit any.
```

## Tests

1. `LessonPlanPrompt_WithExamPrepTemplate_IncludesWrittenProductionRequirement` - prompt contains written task requirement and prohibits oral role-play
2. `LessonPlanPrompt_WithExamPrepTemplate_IncludesTimeLimitGuidance` - prompt contains time limit guidance
3. `LessonPlanPrompt_WithoutTemplate_OmitsExamPrepRequirements` - no exam prep text when TemplateName is null

## Acceptance Criteria Mapping

- AC1: prompt specifies written production tasks -> test 1
- AC2: prompt includes time limit guidance -> test 2
- AC3: Teacher QA re-run with Ana Exam confirms fix -> manual QA after merge
