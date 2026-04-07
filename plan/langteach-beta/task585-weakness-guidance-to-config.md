# Task 585: Move lesson-plan weakness design instruction from C# to config

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/585

## Problem
`LessonPlanUserPrompt` in `PromptService.cs` (line 1148) has this hardcoded string:
```
"Design at least one Practice exercise and one Production task that directly address these patterns."
```
Pedagogical prompt strings should live in config, not C#.

## Changes

### 1. `data/pedagogy/course-rules.json`
Add field `"lessonWeaknessProfileGuidance"` with the current hardcoded value.

### 2. `backend/LangTeach.Api/AI/PedagogyConfig.cs`
Add `string? LessonWeaknessProfileGuidance = null` to `CourseRulesFile` record.

### 3. `backend/LangTeach.Api/Services/IPedagogyConfigService.cs`
Add `string GetLessonWeaknessProfileGuidance();` method declaration.

### 4. `backend/LangTeach.Api/Services/PedagogyConfigService.cs`
Implement: return `_courseRules.LessonWeaknessProfileGuidance` with a hardcoded fallback so behavior never regresses.

### 5. `backend/LangTeach.Api/AI/PromptService.cs`
Replace hardcoded string at line 1148 with `_pedagogy.GetLessonWeaknessProfileGuidance()`.

### 6. `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs`
Add test: `GetLessonWeaknessProfileGuidance_ReturnsNonEmpty`.

## No e2e test needed
This is a pure config refactor with no observable behavior change. Unit test is sufficient.
