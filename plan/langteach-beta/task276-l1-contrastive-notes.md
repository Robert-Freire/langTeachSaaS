# Task 276 — L1 Contrastive Notes in Grammar Blocks

## Goal
Add explicit L1 contrastive notes to grammar blocks. When the student's L1 is known and a contrastive pattern is defined in config, the AI generates a structured note comparing the target structure with the student's L1 behavior. Teacher editor shows a collapsible L1 note section; student view shows a callout box only when a note exists.

## Architecture Decisions
- Contrastive patterns live exclusively in `data/pedagogy/l1-influence.json` (config, not code)
- Pattern matching (L1 + grammar topic) is done in `PedagogyConfigService` (data lookup, no if-chains)
- `PromptService` reads the resolved patterns generically from config — no per-language conditionals
- `l1ContrastiveNote` is an optional field on `GrammarContent` — no note when L1 unknown or no pattern matches
- `cefrRelevance` on each pattern gates generation to appropriate levels (no if-chains)

## Files to Change

### Data
1. `data/pedagogy/l1-influence.json` — add `contrastivePatterns` array to each language family and key specific language entries
2. `data/content-schemas/grammar.json` — add optional `l1ContrastiveNote` object

### Backend — Models
3. `backend/LangTeach.Api/AI/PedagogyConfig.cs` — add `ContrastivePattern` record; add `ContrastivePatterns` field to `LanguageFamily` and `SpecificLanguage` with default `= null` to preserve JSON deserialization of existing entries that lack the field
4. `backend/LangTeach.Api/AI/PedagogyConfigDtos.cs` — add `ContrastiveNoteResult` output DTO (pattern + l1Name)

### Backend — Service
5. `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` — add `GetContrastivePattern(string nativeLang, string grammarTopic, string level)`
6. `backend/LangTeach.Api/Services/PedagogyConfigService.cs` — implement `GetContrastivePattern`: normalize lang, resolve family, union family patterns + language-specific patterns (specific-language entries take priority), find first whose `pattern` value appears as a substring of `grammarTopic` (case-insensitive `Contains`) AND whose `cefrRelevance` includes the level (exact case-insensitive match)

### Backend — Prompt
7. `backend/LangTeach.Api/AI/PromptService.cs` — in `GrammarUserPrompt`:
   - Add `l1ContrastiveNote` to the JSON template string (optional field)
   - Call `BuildL1ContrastiveBlock(ctx)` and append when non-empty
   - `BuildL1ContrastiveBlock`: calls `_pedagogy.GetContrastivePattern`, builds instruction text if found
   - No hardcoded language conditionals

### Backend — Tests
8. `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs` — add tests:
   - Match found for known L1 + matching topic
   - No match when level out of cefrRelevance range
   - No match when L1 unknown
   - No match when topic doesn't match any pattern
   - Specific language overrides family patterns (specific-language `contrastivePatterns` take priority)
9. `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` — add tests:
   - Grammar prompt includes contrastive block when L1 + topic match
   - Grammar prompt omits contrastive block when no L1 set
   - Grammar prompt omits contrastive block when no pattern matches

### Frontend — Types
10. `frontend/src/types/contentTypes.ts` — add `L1ContrastiveNote` interface; add optional `l1ContrastiveNote?: L1ContrastiveNote` to `GrammarContent`; update `coerceGrammarContent` to preserve the field in BOTH paths:
    - Direct path (`isGrammarContent` returns true): field survives as-is (no change needed)
    - Coerce/rebuild path (lines 353-362): spread `...(obj.l1ContrastiveNote != null ? { l1ContrastiveNote: obj.l1ContrastiveNote } : {})` into the candidate before the `isGrammarContent(candidate)` check so the field is not stripped on rebuild

### Frontend — Renderer
11. `frontend/src/components/lesson/renderers/GrammarRenderer.tsx` — add:
    - **Editor**: collapsible section "L1 Comparison Note" with 4 text inputs (l1Example, targetExample, explanation, interferencePattern); collapsed by default; section only appears if field is present or teacher expands it
    - **Preview**: shows note as a styled callout (blue border) after commonMistakes, only when note exists
    - **Student**: highlighted callout box (blue bg, distinct from amber commonMistakes), only when note exists

### Frontend — Tests
12. `frontend/src/components/lesson/renderers/GrammarRenderer.test.tsx` — add:
    - Editor renders collapsed L1 note section when note present
    - Student view shows callout when note present
    - Student view hides callout when note absent
    - Preview shows note when present

## Step-by-step Implementation Order

1. `l1-influence.json` — add `contrastivePatterns` to all language families + key specific languages (italian: ser-estar, false-cognates; germanic: ser-estar, articles; sinitic-japonic: tense, aspect; slavic: articles; arabic: ser-estar)
2. `grammar.json` schema — add optional `l1ContrastiveNote`
3. `PedagogyConfig.cs` — add records
4. `PedagogyConfigDtos.cs` — add DTO
5. `IPedagogyConfigService.cs` + `PedagogyConfigService.cs` — implement method
6. `PromptService.cs` — extend grammar prompt
7. Backend tests
8. `contentTypes.ts` — extend types
9. `GrammarRenderer.tsx` — add UI
10. Frontend tests

## Acceptance Criteria Mapping
- Schema includes optional `l1ContrastiveNote` field → step 2, 3, 10
- `l1-influence.json` extended with `contrastivePatterns` per family → step 1
- `PedagogyConfigService` resolves matching patterns for L1 + topic → step 5
- PromptService reads resolved patterns generically → step 6
- No per-language if-chains in PromptService → enforced by design (BuildL1ContrastiveBlock calls config only)
- Notes linguistically accurate → ensured by JSON content + AI generation
- Teacher editor shows collapsible L1 note section → step 9
- Student view shows callout only when note exists → step 9
- No note when L1 unknown or no pattern match → step 5, 6 (returns null → block not appended)
- Unit tests for schema, config resolution, conditional generation → steps 7, 12

## e2e Coverage
No new e2e test needed — this is an AI generation quality improvement with optional content. The existing grammar block e2e path covers the renderer. A mock-ai-stream helper would need to emit `l1ContrastiveNote` to test the student callout end-to-end; this is deferred (low risk, already covered by unit tests).
