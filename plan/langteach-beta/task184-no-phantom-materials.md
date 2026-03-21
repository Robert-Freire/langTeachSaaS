# Task 184: Fix AI generates exercises referencing materials that don't exist

## Problem
The AI generates exercises referencing images, audio, video, or physical objects that don't exist in the lesson. Example: "describe this picture" when there is no picture.

## Root Cause
`BuildSystemPrompt` in `PromptService.cs` never tells the AI what it can't reference. When materials are uploaded, it says "use these materials," but when no materials exist, there's no constraint preventing the AI from assuming resources are available.

## Solution
Add a self-contained content constraint to `BuildSystemPrompt` that:
- When NO materials are uploaded: instructs the AI to create only self-contained, text-based content. Never reference images, audio, video, or physical objects.
- When materials ARE uploaded: the existing block already handles this (lines 111-118). No change needed.

This applies globally to all content types since it's in the shared system prompt.

## Changes

### 1. `backend/LangTeach.Api/AI/PromptService.cs`
- After the materials block (line 118) / before the JSON instruction (line 120), add a conditional constraint:
  - If `MaterialFileNames` is null or empty: append "All content must be self-contained and work with text alone. Never reference images, audio clips, videos, physical objects, or any external materials that are not part of this lesson."
  - If materials exist: no additional constraint (existing block suffices)

### 2. `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`
- Test: system prompt includes self-contained constraint when no materials
- Test: system prompt does NOT include self-contained constraint when materials are provided (the materials block takes precedence)

## Out of Scope
- No changes to user prompts per content type
- No changes to `LessonPlanUserPrompt` (it already has "Do not reference physical classroom resources")
- No frontend changes
- No database changes
