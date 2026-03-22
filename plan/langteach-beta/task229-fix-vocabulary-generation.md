# Task 229: Fix Vocabulary Generation — L1 Translations and CEFR Level

## Issue
#229 — Fix vocabulary generation: enforce L1 translations and CEFR-appropriate level

## Problem

Teacher QA found two bugs in vocabulary generation (Ana Exam Prep, DELE B2, L1 English):
1. **C1 vocabulary in a B2 lesson**: "soslayar" is above B2. The prompt says "appropriate for {{level}}" but
   doesn't enforce this on the vocabulary items themselves, only on examples.
2. **Definitions in target language**: Definitions were in Spanish instead of English (the student's L1).
   The prompt has no instruction about what language to use for definitions.

## Root Cause

`VocabularyUserPrompt` in `PromptService.cs`:
- Does not constrain vocabulary item level strictly
- Does not reference `StudentNativeLanguage` at all
- The `definition` field in the JSON schema is ambiguous — Claude chooses the target language

## Fix

### PromptService.cs — VocabularyUserPrompt

1. Add `nativeLang` variable from `ctx.StudentNativeLanguage`
2. Add explicit CEFR level constraint: vocabulary items themselves must be at `{level}` (not just examples)
3. When `StudentNativeLanguage` is known: require `definition` to be an L1 translation/gloss, not a
   target-language definition

The `definition` field name is kept unchanged (frontend depends on it).

### PromptServiceTests.cs

Add 2 new tests in the vocabulary section:
1. `VocabularyPrompt_RequiresCefrLevelOnItems` — checks user prompt contains CEFR constraint on items
2. `VocabularyPrompt_RequiresL1Definitions_WhenNativeLanguageKnown` — checks user prompt requires L1
3. `VocabularyPrompt_NoL1Instruction_WhenNativeLanguageNull` — checks no L1 line when native lang unknown

## Files Changed

- `backend/LangTeach.Api/AI/PromptService.cs` — `VocabularyUserPrompt` method only
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` — 3 new tests

## Acceptance Criteria

- [x] Generation prompt explicitly requires vocabulary at the target CEFR level
- [x] Generation prompt specifies definitions/translations in the student's L1
- [ ] Teacher QA re-run with Ana Exam confirms fix (done after merge by user running /teacher-qa ana-exam)
