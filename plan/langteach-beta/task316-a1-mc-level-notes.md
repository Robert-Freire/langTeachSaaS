# Task 316 - Enforce A1 MC option count constraint from section profile

## Issue
#316 - Enforce A1 MC option count constraint from section profile (max 3 options)

## Status: Implementation already complete — tests missing

The implementation described in the issue was delivered as part of prior sprint tasks.
`PromptService.BuildExerciseGuidanceBlock` already:
1. Calls `_profiles.GetLevelSpecificNotes(section, level)`
2. Filters notes by valid exercise types
3. Appends them to the exercise prompt as "Exercise type notes:"

The A1 `practice.json` entry already has:
```json
{"exerciseTypeId": "GR-02", "note": "Maximum 3 options per item at A1"}
```

GR-02 is in A1's `validExerciseTypes`, so it passes the filter and is injected.

## What remains: tests to verify A1/GR-02 injection

### SectionProfileServiceTests.cs (1 new test)
```
GetLevelSpecificNotes_Practice_A1_ReturnsGR02MaxOptionsNote
  - _sut.GetLevelSpecificNotes("practice", "A1") returns note with ExerciseTypeId=="GR-02"
  - note.Note.Should().Contain("3 options")
```

### PromptServiceTests.cs (2 new tests)
```
ExercisesPrompt_A1_InjectsGR02MaxOptionsConstraint
  - ctx = BaseCtx() with { CefrLevel = "A1" }
  - req.UserPrompt.Should().Contain("Maximum 3 options")
  - because: "A1 GR-02 levelSpecificNotes note must reach the exercises prompt"

ExercisesPrompt_B1_DoesNotInjectGR02MaxOptionsConstraint
  - ctx = BaseCtx() (B1)
  - req.UserPrompt.Should().NotContain("Maximum 3 options")
  - because: "B1 has no GR-02 options constraint — only A1 is restricted to 3"
```

## No code changes to PromptService or SectionProfileService needed

The implementation is correct and generic (no level conditionals).
All criteria are met by existing code; these tests close the verification gap.
