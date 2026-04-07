# Task 560: Move session gap thresholds to config (session-gap-policy.json)

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/560

## Goal
Extract the hardcoded day-bucket if/else chain in `PromptService.BuildLessonPlanUserPrompt` to a
JSON config file `data/pedagogy/session-gap-policy.json` loaded by `IPedagogyConfigService`.

## Acceptance criteria
- [ ] `data/pedagogy/session-gap-policy.json` exists with 4 bucket entries (`maxDays` + `instruction`; last entry has no `maxDays` and acts as fallback)
- [ ] `IPedagogyConfigService` loads and exposes the bucket list via a new `GetSessionGapPolicy()` method
- [ ] `PromptService.BuildLessonPlanUserPrompt` iterates buckets instead of the hardcoded if/else chain
- [ ] Existing behavior (2/7/14-day thresholds and instruction strings) is preserved in the JSON defaults
- [ ] Unit test verifies the correct instruction is selected for each bucket boundary (5 cases: 0, 2, 5, 10, 20 days -- one per band including boundary exact values)

## Implementation plan

### 1. Create `data/pedagogy/session-gap-policy.json`

```json
{
  "buckets": [
    { "maxDays": 2, "instruction": "Build directly on previous session. Minimal recap needed." },
    { "maxDays": 7, "instruction": "Include a brief warm-up reviewing key points from last session." },
    { "maxDays": 14, "instruction": "Include a dedicated review activity before introducing new content." },
    { "instruction": "Include a diagnostic mini-activity to assess retention. Do not assume previous content is retained." }
  ]
}
```

The last bucket has no `maxDays` and acts as the fallback.

### 2. Add data model in `backend/LangTeach.Api/AI/PedagogyConfig.cs`

Add at the end of the file:

```csharp
public record SessionGapPolicyFile(SessionGapBucket[] Buckets);

/// <param name="MaxDays">
/// Inclusive upper bound in days since the last session.
/// Null means this is the fallback bucket (must be the last entry, at most one).
/// </param>
public record SessionGapBucket(int? MaxDays, string Instruction);
```

### 3. Add `GetSessionGapPolicy()` to `IPedagogyConfigService`

```csharp
/// <summary>
/// Returns session gap policy buckets in order. Iterate from first to last;
/// use the first bucket whose MaxDays >= daysSince, or the last bucket as fallback (MaxDays == null).
/// </summary>
IReadOnlyList<SessionGapBucket> GetSessionGapPolicy();
```

### 4. Load in `PedagogyConfigService`

- Add private field: `private readonly SessionGapPolicyFile _sessionGapPolicy;`
- Load in constructor (same pattern as other resources):
  ```csharp
  _sessionGapPolicy = LoadJson<SessionGapPolicyFile>(assembly, "LangTeach.Api.Pedagogy.session-gap-policy.json");
  ```
- Add validation in `ValidateCrossLayerRefs`:
  - At least one bucket exists.
  - Exactly one bucket has `MaxDays == null` and it is the last one.
  - All instruction strings are non-empty.
  - `MaxDays` values are in strictly ascending order (excluding the null fallback).
- Implement interface method:
  ```csharp
  public IReadOnlyList<SessionGapBucket> GetSessionGapPolicy() => _sessionGapPolicy.Buckets;
  ```

### 5. Register embedded resource in `LangTeach.Api.csproj`

Add after the existing `practice-stages.json` entry:
```xml
<EmbeddedResource Include="..\..\data\pedagogy\session-gap-policy.json"
                  Link="Pedagogy\session-gap-policy.json" />
```

### 6. Replace hardcoded if/else in `PromptService.cs` (line 1175-1182)

Replace:
```csharp
var gapInstruction = sessionHistoryForGap.DaysSinceLastSession <= 2
    ? "Build directly on previous session. Minimal recap needed."
    : sessionHistoryForGap.DaysSinceLastSession <= 7
        ? "Include a brief warm-up reviewing key points from last session."
        : sessionHistoryForGap.DaysSinceLastSession <= 14
            ? "Include a dedicated review activity before introducing new content."
            : "Include a diagnostic mini-activity to assess retention. Do not assume previous content is retained.";
```

With:
```csharp
var gapBuckets = _pedagogy.GetSessionGapPolicy();
var gapInstruction = gapBuckets
    .FirstOrDefault(b => b.MaxDays >= sessionHistoryForGap.DaysSinceLastSession)?.Instruction
    ?? gapBuckets[^1].Instruction;
```

### 7. Add unit tests in `PromptServiceTests.cs`

Add a new test class or region specifically for the session-gap-policy config-driven behavior.
The existing tests at lines 2544-2608 already cover the 4 band boundaries and can stay as-is
(they test the behavior by prompting for specific strings, which remains stable).

Add one new test that explicitly verifies boundary values are driven from config (verifying that
an injected `IPedagogyConfigService` with a custom policy produces the expected instruction).
This test lives in `PromptServiceTests.cs` alongside the existing gap tests.

The test fixture already uses the real `PedagogyConfigService` which will load the new JSON.
New test:
- `SessionGapPolicy_BucketBoundaries_AllFourBandsResolved` -- verifies days 2, 3, 7, 8, 14, 15 map to the right instruction strings from the real loaded config.

## Files changed
- `data/pedagogy/session-gap-policy.json` (new)
- `backend/LangTeach.Api/LangTeach.Api.csproj` (add embedded resource)
- `backend/LangTeach.Api/AI/PedagogyConfig.cs` (add 2 records)
- `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` (add 1 method)
- `backend/LangTeach.Api/Services/PedagogyConfigService.cs` (load + validate + implement)
- `backend/LangTeach.Api/AI/PromptService.cs` (replace if/else)
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` (add boundary test)

## No e2e required
This is a pure backend refactor with no observable behavior change. Existing prompt output is
identical to before. The AC for e2e coverage is met by the existing gap-band tests that run
against the real config.
