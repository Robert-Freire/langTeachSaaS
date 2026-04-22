# Task 826 — ExtractionMode enum refactor

## Goal
Replace string fields in `ExtractedTextFieldDto` and `ExtractedReflectionDto` with typed enums.

## Files to change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/DTOs/ReflectionExtractionDtos.cs` | Add `ExtractionMode` and `ExtractedHomeworkStatus` enums; update record fields |
| `backend/LangTeach.Api/Services/ReflectionExtractionService.cs` | Update `ParseTextFieldOrNull` and `ParseHomeworkStatus` to return enum values |
| `backend/LangTeach.Api/Services/StubReflectionExtractionService.cs` | Replace string literals with enum values |
| `backend/LangTeach.Api.Tests/Services/ReflectionExtractionServiceTests.cs` | Update Mode and PreviousHomeworkStatus assertions |
| `backend/LangTeach.Api.Tests/Controllers/SessionsControllerTests.cs` | Update Mode assertions |
| `backend/LangTeach.Api.Tests/Services/TelegramConversationServiceTests.cs` | Update `ExtractedTextFieldDto` constructor calls |

## Enum design

```csharp
[JsonConverter(typeof(JsonStringEnumConverter<ExtractionMode>), NamingPolicy = JsonKnownNamingPolicy.CamelCase)]
// OR: attribute + converter instance
```

Actually, since we're on .NET 8+, we can use:
```csharp
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ExtractionMode { Append, Replace, Skip }
```
with a global naming policy or instance-level. But the issue specifies `JsonStringEnumConverter(JsonNamingPolicy.CamelCase)` — this requires passing it as a converter attribute argument, which isn't directly supported in C# attributes.

The idiomatic pattern used in the project is: decorate each enum with `[JsonConverter(typeof(JsonStringEnumConverter))]` and configure `JsonNamingPolicy.CamelCase` globally, OR apply per-property with `[JsonPropertyName]` on each enum member. 

The cleanest approach for attribute-based is:
```csharp
[JsonConverter(typeof(JsonStringEnumConverter))]
[JsonStringEnumMemberName] // per member if needed
```

Actually on .NET 8, `JsonStringEnumConverter` can take a naming policy in its constructor. In an attribute, this isn't directly injectable. The project pattern is to decorate with `[JsonConverter(typeof(JsonStringEnumConverter))]` and rely on camelCase being configured globally (ASP.NET Core JSON options usually configure this).

Let me check how the existing code handles this for other enums. The simplest approach: 
- Decorate with `[JsonConverter(typeof(JsonStringEnumConverter))]`
- The enum members named `Append`, `Replace`, `Skip` will serialize based on the global JSON options (which in ASP.NET Core with `AddJsonOptions` can include `JsonNamingPolicy.CamelCase`)

OR: use per-member `[JsonPropertyName("append")]` attributes.

## Acceptance criteria

- `ExtractionMode` enum with `Append`, `Replace`, `Skip`
- `ExtractedHomeworkStatus` enum with `Done`, `Partial`, `NotDone`
- Both use camelCase JSON serialization
- `ExtractedTextFieldDto.Mode` is `ExtractionMode`
- `ExtractedReflectionDto.PreviousHomeworkStatus` is `ExtractedHomeworkStatus?`
- All existing tests pass (with assertions updated)
- No frontend contract change (mode values remain lowercase)
