# Task 839: Truncate raw Claude response in debug logs

## Issue
#839 — chore: truncate raw Claude response in debug logs to prevent session content leakage

## Problem
`ReflectionExtractionService.cs:85` logs the full raw Claude JSON at Debug level when parsing fails, potentially exposing full session content (topics, student difficulties, notes) in logs.

## Fix
One-line change in `backend/LangTeach.Api/Services/ReflectionExtractionService.cs` line 85:

```csharp
// Before
_logger.LogDebug("Unparseable Claude response: {Json}", json);

// After
_logger.LogDebug("Unparseable Claude response: {Preview}...", json is null ? null : json[..Math.Min(200, json.Length)]);
```

## Acceptance Criteria
- [ ] Debug log capped at ~200 characters
- [ ] Log still identifies parse failure and shows enough payload to diagnose format issues

## Tests
Existing `ReflectionExtractionServiceTests.cs` — verify no changes needed (no test asserts on log output). No new tests required for a log truncation change.
