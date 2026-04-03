# Task 460 — Fix Excel Importer: Parse Column F for CEFR Level, Save Full Names

## Issue
#460 — Fix Excel importer: parse column F for CEFR level, save full names

## Problem
- 19/35 sheets have no CEFR suffix in the sheet name, so the importer defaults to A1.
- Column F ("test Preply") contains the assessed level (e.g. "C1", "Preply A2", "A2.3") but is only written to notes.
- Plus levels (B1+) and A0 levels are stored as-is instead of being normalized to base band.

## Solution

### StudentMatcher.cs
1. Add `NormalizeLevel(string? rawLevel): string?`
   - Strip dot-subband notation: A2.3 -> A2
   - Strip + suffix: B1+ -> B1
   - Map A0 -> A1
   - Return null if input is null
2. Add `ParseLevelFromText(string text): string?`
   - Regex `\b(A0|A1|A2|B1|B2|C1|C2)[+]?\b` (case-insensitive)
   - Returns NormalizeLevel(match) or null if no match

### ExcelImporter.cs
1. Add `ExtractLevelFromColumnF(IXLWorksheet worksheet): string?`
   - Iterate data rows (skip row 1), read col F, call ParseLevelFromText
   - Return first non-null result
2. Update `CreateStudentAsync(string sheetName, IXLWorksheet worksheet)`
   - Get (name, rawLevel) from ParseSheetName
   - Normalize rawLevel via NormalizeLevel
   - If normalized level is null, call ExtractLevelFromColumnF
   - Fall back to "A1"
3. Update call site in ImportAsync to pass worksheet

### Tests (LangTeach.Api.Tests)
- Add ProjectReference to LangTeach.MigrationTool
- Add InternalsVisibleTo in MigrationTool.csproj
- StudentMatcherTests: NormalizeLevel variants, ParseLevelFromText patterns, ParseSheetName full names

## Acceptance Criteria
- [ ] Students without level suffix get level from column F
- [ ] Known column F patterns parsed: "C1", "B1+", "A0+", "Preply A2", "A2.3"
- [ ] A0/A0+ -> A1; plus levels -> base band
- [ ] Full names preserved (no truncation/period artifacts)
- [ ] Tests for column F level extraction and normalization
