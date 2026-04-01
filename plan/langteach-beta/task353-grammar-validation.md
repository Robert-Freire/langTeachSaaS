# Task 353 - Add AI Output Validation for Grammar Model Language Errors

## Issue
#353 - Add AI output validation for grammar model language errors

## Problem
Teacher QA (Marco B1.1, 2026-03-28) found incorrect Spanish in generated model language:
- "Eres de acuerdo" in a Production scenario (should be "estás de acuerdo")
- "Era deprimida" as MC answer (modern Spanish: "estaba deprimida")

## Solution Architecture

Config-driven post-generation validation via regex patterns in JSON. Engine is generic C#; no language-specific logic in code.

### New files

```
data/pedagogy/grammar-validation-rules.json          # 5+ Spanish rules
backend/LangTeach.Api/AI/GrammarValidation.cs        # JSON deserialization models
backend/LangTeach.Api/Services/IGrammarValidationService.cs
backend/LangTeach.Api/Services/GrammarValidationService.cs
backend/LangTeach.Api.Tests/Services/GrammarValidationServiceTests.cs
```

### Changed files

```
backend/LangTeach.Api/LangTeach.Api.csproj           # add EmbeddedResource for new JSON
backend/LangTeach.Api/Program.cs                     # register IGrammarValidationService singleton
backend/LangTeach.Api/DTOs/ContentBlockDto.cs        # add GrammarWarnings field (nullable)
backend/LangTeach.Api/Controllers/LessonContentBlocksController.cs  # inject service, compute warnings
frontend/src/api/generate.ts                         # add GrammarWarning type + field on ContentBlockDto
frontend/src/components/lesson/ContentBlock.tsx      # show warnings banner
frontend/src/components/lesson/ContentBlock.test.tsx # tests for warnings display
```

## JSON rules file structure

```json
{
  "version": "1.0",
  "rules": [
    {
      "id": "ser-estar-de-acuerdo",
      "targetLanguage": "spanish",
      "category": "verb-choice",
      "pattern": "\\b(soy|eres|es|somos|sois|son|era|eras|fue|fuiste)\\s+de\\s+acuerdo\\b",
      "correction": "Use estar, not ser, with 'de acuerdo'",
      "severity": "high",
      "contextRelevance": {
        "grammarFocusPatterns": ["ser/estar", "ser.estar", "copulative"]
      }
    }
  ]
}
```

5 initial Spanish rules:
1. `ser-estar-de-acuerdo` — ser vs estar with "de acuerdo"
2. `ser-estar-adjective-state` — ser with state adjectives (deprimido, cansado, enfermo, contento, triste, nervioso, aburrido)
3. `por-para-purpose` — "por + infinitive" for purpose clauses (should be "para")
4. `false-cognate-embarazada` — "embarazada" used where "embarrassed" intended (false cognate marker)
5. `subjunctive-after-ojalá` — "ojalá" + indicative instead of subjunctive

## C# model classes (GrammarValidation.cs)

```csharp
// Deserialization models
public record GrammarValidationRulesFile(string Version, GrammarValidationRule[] Rules);
public record GrammarValidationRule(
    string Id,
    string TargetLanguage,
    string Category,
    string Pattern,
    string Correction,
    string Severity,
    GrammarValidationContextRelevance? ContextRelevance = null);
public record GrammarValidationContextRelevance(string[] GrammarFocusPatterns);

// Output DTO (not stored in DB, computed at response time)
public record GrammarWarning(string RuleId, string Correction, string Severity, string MatchedText);
```

## GrammarValidationService

Constructor (singleton, startup validation):
1. Load `LangTeach.Api.Pedagogy.grammar-validation-rules.json` from embedded resources
2. For each rule: check required fields (id, targetLanguage, pattern, correction, severity) - throw on missing
3. Compile regex patterns - throw on invalid (fail-fast at startup)
4. Cache compiled rules as `(rule, compiledRegex)[]`
5. Log count on success

`Validate(string content, string targetLanguage, string? grammarFocus)`:
1. Normalize targetLanguage to lowercase
2. Filter rules where `rule.TargetLanguage == normalizedLang`
3. For each matching rule: run regex against content (case-insensitive)
4. If match found:
   - Effective severity = rule.Severity
   - If contextRelevance.grammarFocusPatterns is non-null AND grammarFocus is non-null AND any pattern matches grammarFocus (case-insensitive contains): elevate by one step ("medium" -> "high", "high" stays "high" — no "critical" value; frontend only knows high/medium/low)
   - Capture first match text
   - Add `GrammarWarning(rule.Id, rule.Correction, effectiveSeverity, matchedText)`
5. Return array (one warning max per rule, deduplicated by ruleId)
6. Performance: regex over generated content (typically <10KB), fast enough to meet 500ms AC

## ContentBlockDto extension

```csharp
public record ContentBlockDto(
    Guid Id,
    Guid? LessonSectionId,
    ContentBlockType BlockType,
    string GeneratedContent,
    string? EditedContent,
    bool IsEdited,
    string? GenerationParams,
    object? ParsedContent,
    DateTime CreatedAt,
    GrammarWarning[]? GrammarWarnings = null);  // new, nullable, defaults null
```

## LessonContentBlocksController changes

Inject `IGrammarValidationService`. Change `ToDto` signature:

```csharp
private static ContentBlockDto ToDto(LessonContentBlock b, string? language, string? grammarFocus, IGrammarValidationService svc)
{
    var warnings = language is not null ? svc.Validate(b.GeneratedContent, language, grammarFocus) : null;
    return new ContentBlockDto(
        b.Id, b.LessonSectionId, b.BlockType, b.GeneratedContent, b.EditedContent,
        b.EditedContent != null, b.GenerationParams,
        TryParseContent(b.EditedContent ?? b.GeneratedContent), b.CreatedAt,
        warnings?.Length > 0 ? warnings : null);
}
```

Language comes from the lesson (already loaded in both GET and POST endpoints). GrammarFocus extracted from `GenerationParams` JSON by deserializing the `grammarConstraints` key (a string), which maps to the `TeacherGrammarConstraints` field in generation params. Parse defensively: if null/absent, pass null to `Validate`.

The GET endpoint's `blocks.Select(ToDto)` method group must be changed to a lambda to avoid overload ambiguity:
```csharp
blocks.Select(b => ToDto(b, lesson.Language, ExtractGrammarFocus(b.GenerationParams), _grammarValidationService))
```

The POST Save endpoint: `lesson` is already loaded at line 80; use the same lambda pattern for the `CreatedAtAction` return.

Keep the static overload `ToDto(LessonContentBlock b)` (no-warnings version) only for PUT/DELETE endpoints where language context is not available.

Helper: `private static string? ExtractGrammarFocus(string? generationParams)` — parses JSON, reads `grammarConstraints` key, returns string value or null.

## Frontend changes

Add to `generate.ts`:
```ts
export interface GrammarWarning {
  ruleId: string
  correction: string
  severity: string
  matchedText: string
}
// Add to ContentBlockDto interface:
grammarWarnings?: GrammarWarning[] | null
```

`ContentBlock.tsx`: add a dismissible warning section below the block header when `block.grammarWarnings` is non-empty. Follow the amber styling of `CefrMismatchWarning`. Each warning shows severity badge, matched text (bold), and correction.

```tsx
{block.grammarWarnings && block.grammarWarnings.length > 0 && (
  <div data-testid="grammar-warnings" className="...amber banner...">
    {block.grammarWarnings.map(w => (
      <div key={w.ruleId}>
        <Badge severity={w.severity}>{w.severity}</Badge>
        Found: <code>{w.matchedText}</code> — {w.correction}
      </div>
    ))}
  </div>
)}
```

## Tests

### GrammarValidationServiceTests.cs (~8 tests)
1. `Validate_SpanishContent_DetectsSerEstarViolation` — "eres de acuerdo" triggers rule
2. `Validate_NonSpanishContent_ReturnsNoWarnings` — "vous êtes d'accord" not flagged for Spanish rule
3. `Validate_NullGrammarFocus_UsesBaselineSeverity`
4. `Validate_MatchingGrammarFocus_ElevatesSeverity` — grammar focus "ser/estar" elevates medium -> high (high stays high)
5. `Validate_NoMatch_ReturnsEmpty`
6. `Validate_LanguageCaseInsensitive` — "Spanish" == "spanish"
7. `Constructor_InvalidRegex_ThrowsAtStartup`
8. `Constructor_MissingRequiredField_ThrowsAtStartup` — note: C# record positional params deserialize to null when absent; service constructor must explicitly check for null/empty and throw, this is not automatic from the record type

### e2e happy path (e2e/tests/)
- `grammar-validation.spec.ts`: generate content with a seeded mock AI response containing "eres de acuerdo" for a Spanish lesson, verify the grammar warnings banner appears in the content block UI

### ContentBlock.test.tsx additions (~3 tests)
1. Renders grammar warnings banner when warnings present
2. Does not render warnings section when grammarWarnings is null
3. Shows correct severity and correction text

## EmbeddedResource registration

In `LangTeach.Api.csproj` (follow existing `Link=` convention, not `LogicalName=`):
```xml
<EmbeddedResource Include="..\..\data\pedagogy\grammar-validation-rules.json"
                  Link="Pedagogy\grammar-validation-rules.json" />
```
This produces resource name `LangTeach.Api.Pedagogy.grammar-validation-rules.json`, matching the `LoadJson` call.

## Acceptance criteria mapping

| AC | Implementation |
|---|---|
| Rules in grammar-validation-rules.json | `data/pedagogy/grammar-validation-rules.json` |
| JSON schema validates at startup | Constructor fails fast on missing fields + invalid regex |
| Service language-agnostic | `Validate(content, targetLanguage, grammarFocus)`, no C# language conditions |
| No hardcoded regex/lang/category in C# | All in JSON |
| Context relevance from config | `contextRelevance.grammarFocusPatterns` array, no if/else |
| Warnings in lesson warnings panel | `ContentBlock.tsx` warning banner, uses `block.grammarWarnings` |
| <500ms latency | Regex on <10KB, compiled at startup |
| 5 initial Spanish rules | 5 rules in JSON |
| Unit tests cover rule loading, matching, elevation, filtering | 8 backend tests |
| Non-blocking | warnings array, content still renders |

## Not in scope
- LLM-based validation
- Non-grammar content types (grammar warnings only fire when Language matches)
- DB storage of warnings (computed at response time)
- Dismissable warnings (informational only, like CefrMismatchWarning)
