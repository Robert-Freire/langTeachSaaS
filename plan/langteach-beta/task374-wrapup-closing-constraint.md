# Task 374: Move WrapUp "no new material" constraint to section profile JSON

## Goal
Move the hardcoded `extraConstraint` in `PromptService.ConversationUserPrompt` for WrapUp into `wrapup.json`, following the config-vs-code pattern used by all other constraints.

## Changes

### 1. `SectionProfile.cs` - Add `ClosingConstraint` to `SectionLevelProfile`
Add optional `string? ClosingConstraint = null` field to the record.

### 2. `wrapup.json` - Populate `closingConstraint` at all CEFR levels
Add `"closingConstraint": "IMPORTANT: Review only content from this lesson. Do not introduce new vocabulary, grammar structures, or situations."` to every level (A1-C2). The constraint is uniform across levels.

### 3. `ISectionProfileService.cs` - Add `GetClosingConstraint`
```csharp
string? GetClosingConstraint(string sectionType, string cefrLevel);
```

### 4. `SectionProfileService.cs` - Implement `GetClosingConstraint`
Pattern identical to `GetScope`: return `lp.ClosingConstraint` if found, else null.

### 5. `PromptService.cs` - Remove hardcoded string
In `ConversationUserPrompt`, replace the hardcoded `extraConstraint:` string with:
```csharp
extraConstraint: _profiles.GetClosingConstraint("wrapup", level)
```

### 6. Tests
- `SectionProfileServiceTests.cs`: add test verifying `GetClosingConstraint("wrapup", "A1")` returns the expected string, and returns null for "warmup".
- `PromptServiceTests.cs`: existing WrapUp conversation tests should still pass. Optionally verify the closing constraint text appears in generated prompt.

## Notes
- `ClosingConstraint` is optional (null default) so no existing JSON files break.
- No schema or API changes needed; this is purely an internal config field.
- `BuildSectionConversationPrompt` already handles `extraConstraint == null` gracefully.
