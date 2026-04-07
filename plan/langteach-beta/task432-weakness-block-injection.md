# Task 432 — Block-level weakness injection + student error profile

## Issue
#432 Teacher QA: L1 and student weakness targeting gaps in generated content

## Problem
`GetWeaknessTargetingGuidance` is called only inside `LessonPlanUserPrompt`. Block-level generation
prompts (exercises, error-correction, guided writing, conversation) receive only a brief "Areas to
improve: ..." mention via `BuildSystemPrompt`, not the actionable per-section guidance that tells the
model HOW to target those weaknesses. Result: Nadia's accent marks and Ricardo's false cognates are
ignored in individual content blocks.

## Root cause (confirmed)
`PromptService.cs`:
- `LessonPlanUserPrompt` (line 1084-1104): builds a `DECLARED WEAKNESSES` block with per-section
  guidance from `_pedagogy.GetWeaknessTargetingGuidance(section)`.
- `ExercisesUserPrompt`, `ErrorCorrectionUserPrompt`, `GuidedWritingUserPrompt`, `ConversationUserPrompt`:
  do not call `GetWeaknessTargetingGuidance` at all.

## Changes

### 1. Add `BuildWeaknessTargetingForSection` helper in `PromptService.cs`
```csharp
private string BuildWeaknessTargetingForSection(GenerationContext ctx, string sectionType)
```
- Sanitizes `ctx.StudentWeaknesses` (same truncation as lesson plan: take 2, max 120 chars each)
- Calls `_pedagogy.GetWeaknessTargetingGuidance(sectionType)`
- If both present, returns:
  ```
  \n\nSTUDENT WEAKNESS TARGETING:
  Documented weaknesses: {weaknessText}
  {guidance with {weaknesses} substituted}
  ```
- Returns empty string if no weaknesses or no guidance for this section

### 2. Inject into block-level user prompts
Append `BuildWeaknessTargetingForSection(ctx, sectionType)` before the return in:

| Method | Section type |
|--------|-------------|
| `ExercisesUserPrompt` | `"practice"` |
| `ErrorCorrectionUserPrompt` | `"practice"` |
| `GuidedWritingUserPrompt` | `ctx.SectionType ?? "production"` |
| `ConversationUserPrompt` (general path only — WarmUp and WrapUp are routed before this point) | `ctx.SectionType ?? "production"` |

### 3. Add "STUDENT ERROR PROFILE" block to lesson plan prompt
In `LessonPlanUserPrompt`, before the `DECLARED WEAKNESSES` block, when weaknesses are present, add:

```
STUDENT ERROR PROFILE — top documented error patterns for this student:
1. {weakness1}
2. {weakness2}   (if present)
Design at least one Practice exercise and one Production task that directly address these patterns.
```

This makes the lesson plan prompt include both the structured guidance AND the concrete weakness list
with explicit design instruction.

## Acceptance criteria mapping

| AC | Change |
|----|--------|
| GetWeaknessTargetingGuidance passed to block-level | Changes #1 + #2 |
| Practice section targets documented weakness | ExercisesUserPrompt injection (most exercises) |
| Lesson plan includes student error profile | Change #3 |
| Teacher QA passes for Nadia (B2 AR) and Ricardo (C1 PT) | Run `/teacher-qa nadia` and `/teacher-qa ricardo` after implementation |
| Update prior-findings.md | After PR merge |

## Tests to add in `PromptServiceTests.cs`

1. `LessonPlanPrompt_WithWeaknesses_IncludesStudentErrorProfile` — UserPrompt contains "STUDENT ERROR PROFILE"
2. `ExercisesPrompt_WithWeaknesses_IncludesWeaknessTargeting` — UserPrompt contains weakness text + "STUDENT WEAKNESS TARGETING"
3. `ErrorCorrectionPrompt_WithWeaknesses_IncludesWeaknessTargeting` — same check
4. `GuidedWritingPrompt_WithWeaknesses_IncludesWeaknessTargeting` — same check
5. `ExercisesPrompt_WithoutWeaknesses_DoesNotIncludeWeaknessTargeting` — no "STUDENT WEAKNESS TARGETING" when weaknesses is null/empty

## E2E coverage
No new e2e test needed — the weakness injection is a prompt-level change. The Teacher QA skill
(which hits real Claude) serves as the integration test for AC4. Existing e2e tests for generation
endpoints are unchanged.

## Files to change
- `backend/LangTeach.Api/AI/PromptService.cs` — helper + injections + lesson plan profile block
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` — 5 new tests

## Files to update after merge
- `.claude/skills/teacher-qa/output/prior-findings.md`
