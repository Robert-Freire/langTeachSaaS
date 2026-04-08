# Task 562 — CurriculumGenerationService: call StripFences before deserializing AI response

## Issue
#562 — P2, area:backend

## Problem
`CurriculumGenerationService` has two deserialization sites that call `.Trim()` directly on AI content without stripping markdown code fences first. If the model wraps JSON in triple-backtick fences, `JsonSerializer.Deserialize` throws `JsonException`.

## Sites to fix

### Site 1 — Free generation path (line 113)
```csharp
// BEFORE
aiEntries = JsonSerializer.Deserialize<List<AiEntryDto>>(
    aiResponse.Content.Trim(), ...);

// AFTER
var stripped = ContentJsonHelper.StripFences(aiResponse.Content);
if (stripped is null)
    throw new CurriculumGenerationException("AI response is not valid JSON.");
aiEntries = JsonSerializer.Deserialize<List<AiEntryDto>>(stripped, ...);
```

### Site 2 — ApplyPersonalization method (line 186)
```csharp
// BEFORE
personalization = JsonSerializer.Deserialize<List<PersonalizationDto>>(
    aiContent.Trim(), ...);

// AFTER
var stripped = ContentJsonHelper.StripFences(aiContent);
if (stripped is null)
{
    _logger.LogWarning("AI personalization response is not valid JSON; keeping original topics.");
    return;
}
personalization = JsonSerializer.Deserialize<List<PersonalizationDto>>(stripped, ...);
```

## Changes
- `backend/LangTeach.Api/Services/CurriculumGenerationService.cs`: apply StripFences at both sites

## Tests
- Existing unit tests in `CurriculumGenerationServiceTests.cs` cover the happy path
- Add tests for fence-wrapped JSON at both sites (free generation throws on bad JSON; personalization logs+returns gracefully)

## Acceptance criteria
- Both sites use `ContentJsonHelper.StripFences` before deserializing
- Null return from `StripFences` is handled: hard throw at site 1, graceful return at site 2
