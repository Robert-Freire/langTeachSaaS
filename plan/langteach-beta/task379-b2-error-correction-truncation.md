# Task 379: B2 Error Correction Explanations Truncated

## Issue
GitHub #379 - B2 error correction explanations cut off mid-sentence in Practice sections
(Carmen B2.1 and Ana Exam Prep B2, Teacher QA 2026-03-29)

## Root Cause
The exercises prompt already instructs "2-3 sentences" per explanation, but GR-04 at B2
involves discourse-level corrections with complex Spanish grammar (subjunctivo, estilo indirecto),
producing longer explanations that exhaust the token budget. The last item gets truncated.

## Gap Found During Analysis
`LevelSpecificNotes` is defined on `SectionProfileLevelConfig` and loaded from JSON, but
`ISectionProfileService` exposes no method to read them, and `PromptService` never injects
them into prompts. This is the mechanism the issue author expected to already exist.

## Fix

### 1. ISectionProfileService - new method
Add `LevelSpecificNote[] GetLevelSpecificNotes(string sectionType, string cefrLevel)`:
Returns the `levelSpecificNotes` array for the section+level, or empty array if not found.

### 2. SectionProfileService - implement
```csharp
public LevelSpecificNote[] GetLevelSpecificNotes(string sectionType, string cefrLevel)
{
    var profile = GetProfile(sectionType);
    if (profile is null) return [];
    var level = NormalizeLevel(cefrLevel);
    if (profile.Levels.TryGetValue(level, out var lp))
        return lp.LevelSpecificNotes ?? [];
    return [];
}
```

### 3. PromptService.BuildExerciseGuidanceBlock - inject notes
After listing allowed types, append level-specific notes:
```
LEVEL-SPECIFIC NOTES:
- GR-04 (Error Correction): Keep error correction explanations to a maximum of 2 sentences. ...
```
Only append the note for exercise types that are in the valid set for this section+level.

### 4. practice.json - add B2/C1/C2 constraint for GR-04
Update `levelSpecificNotes` for GR-04 in B2 to combine existing discourse guidance with
the explanation length constraint. Add notes for C1 and C2 as well since they have the
same token pressure.

**B2** (update existing note, keep discourse guidance, add length constraint):
```json
{
  "exerciseTypeId": "GR-04",
  "note": "Discourse-level error correction is appropriate at B2; include cohesion and register errors, not only morphosyntax. Keep each explanation to a maximum of 2 sentences: one identifying the error type, one stating the rule."
}
```

**C1** (new entry):
```json
{
  "exerciseTypeId": "GR-04",
  "note": "Error correction at C1 focuses on pragmatic and register violations. Keep each explanation to a maximum of 2 sentences: one identifying the error category, one explaining the pragmatic or register constraint."
}
```

**C2** (update existing note):
```json
{
  "exerciseTypeId": "GR-04",
  "note": "Error correction at C2 includes pragmatic inappropriateness and register violations, not only grammatical errors. Keep each explanation to a maximum of 2 sentences."
}
```

### 5. Tests
- `SectionProfileServiceTests`: `GetLevelSpecificNotes_ReturnsNotes_WhenPresent` and `GetLevelSpecificNotes_ReturnsEmpty_WhenLevelNotFound`
- `PromptServiceTests`: verify the exercises prompt for B2 practice includes the GR-04 note

### 6. prior-findings.md update
Add a row for this fix after PR is merged (per acceptance criteria).

## Files Changed
- `backend/LangTeach.Api/Services/ISectionProfileService.cs` - add method
- `backend/LangTeach.Api/Services/SectionProfileService.cs` - implement
- `backend/LangTeach.Api/AI/PromptService.cs` - inject notes in BuildExerciseGuidanceBlock
- `data/section-profiles/practice.json` - B2/C1/C2 GR-04 notes updated
- `backend/LangTeach.Api.Tests/Services/SectionProfileServiceTests.cs` - 2 tests
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` - 1 test

## Out of Scope
- Option 2 (maxTokens per level in CEFR config) - not needed if option 1 works
- No changes to ClaudeApiClient or maxTokens settings

## Acceptance Criteria Traceability
- [x] Constraint added to section profile config (practice.json, not hardcoded)
- [x] No level-specific conditionals in PromptService or ClaudeApiClient
- [x] All backend tests pass
- [ ] Carmen B2.1 and Ana Exam B2 verified by Teacher QA (post-merge)
- [ ] prior-findings.md updated (post-merge)
