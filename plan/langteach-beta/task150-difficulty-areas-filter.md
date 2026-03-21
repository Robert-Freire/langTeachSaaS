# Task #150: Student difficulty areas should be filtered by target language

## Problem
The student profile's "Areas to Improve" (WEAKNESSES) shows the same list regardless of the student's target language. E.g., "phrasal verbs" appears for Spanish students (it's English-specific), and Spanish-specific items like "ser/estar" or "por/para" are missing entirely.

## Scope Analysis

Two difficulty-related UI sections exist in StudentForm:
1. **"Areas to Improve" (WEAKNESSES)**: free-text tags like "phrasal verbs", "subjunctive". These are language-specific and are the primary target of this fix.
2. **"Specific Difficulties" (DIFFICULTY_CATEGORIES)**: generic categories (grammar, vocabulary, pronunciation, writing, comprehension). These apply to all languages and do NOT need filtering.

## Approach

### Frontend: Language-aware WEAKNESSES map

**File: `frontend/src/lib/studentOptions.ts`**

Replace the flat `WEAKNESSES` array with a `WEAKNESSES_BY_LANGUAGE` map keyed by language name. Include a `common` set of universal items shared across all languages. Export a helper function `getWeaknessesForLanguage(lang: string)` that merges common + language-specific items.

Languages to cover (per acceptance criteria): English, Spanish, French, German.
Other languages (Italian, Portuguese, Mandarin, Japanese, Arabic, Other) get common-only items.

Proposed weakness lists:
- **Common** (all languages): past tenses, pronunciation, vocabulary range, comprehension
- **English**: articles, phrasal verbs, conditionals, reported speech, prepositions
- **Spanish**: ser/estar, subjunctive, por/para, preterite vs imperfect, gender agreement
- **French**: subjunctive, partitive articles, pronoun placement, passe compose vs imparfait, gender agreement
- **German**: cases (Akkusativ/Dativ), word order, separable verbs, gendered articles, adjective declension

Remove the old flat `WEAKNESSES` export (only imported by StudentForm.tsx, which will switch to the helper).

### Frontend: MultiSelect custom entry support

**File: `frontend/src/pages/StudentForm.tsx`**

The current `MultiSelect` component only allows selecting from predefined options. The acceptance criteria require "teacher can still add custom free-text difficulty areas." Add an `allowCustom` prop to MultiSelect that, when enabled, lets the user type a custom value and press Enter to add it (similar to the interests input). When the search input has text that doesn't match any option, show a "Add '<text>'" item that adds the custom value on click/Enter.

### Frontend: StudentForm.tsx changes

**File: `frontend/src/pages/StudentForm.tsx`**

The "Areas to Improve" `<MultiSelect>` currently uses `options={WEAKNESSES}`. Change to `options={getWeaknessesForLanguage(language)}` where `language` is the form's current learning language state. Pass `allowCustom` to the weaknesses MultiSelect.

**Empty language state:** When no language is selected yet (new student form, `language === ''`), show common weaknesses only. This gives the teacher useful options immediately while avoiding language-specific noise.

When the language changes, existing selected weaknesses that are no longer in the new language's list should be preserved (not stripped). The MultiSelect chip display already falls back to the raw value for items not in options (line 112: `options.find(...)?.label ?? value`), so legacy data and custom entries display correctly.

### Backend: No changes needed

The backend stores weaknesses as a free-text string array with no server-side validation of weakness values. It accepts any strings. No backend changes are required for this fix.

The `AllowedDifficultyCategories` validation in StudentService only applies to the structured "Specific Difficulties" (category field), not to weaknesses.

### Tests

**Frontend unit tests:**
- `studentOptions.test.ts`: test `getWeaknessesForLanguage()` returns language-specific + common items, returns common-only for unknown languages, returns common-only for empty string
- `StudentForm.test.tsx`: update mock to export `getWeaknessesForLanguage` instead of flat `WEAKNESSES`; test that changing learning language updates the weakness dropdown options; test custom free-text entry

**Backend tests:** No changes needed (backend is agnostic to weakness values).

**E2E test:**
- Verify that selecting English shows "Phrasal Verbs" in weaknesses dropdown
- Verify that selecting Spanish shows "Ser/Estar" but not "Phrasal Verbs"
- Verify that an existing weakness from a different language is preserved when language changes

## Files to modify

1. `frontend/src/lib/studentOptions.ts` (add language-aware map + helper)
2. `frontend/src/pages/StudentForm.tsx` (wire up language-aware weaknesses)
3. `frontend/src/lib/studentOptions.test.ts` (new: unit tests for helper)
4. `frontend/src/pages/StudentForm.test.tsx` (update: test language-aware behavior)
5. E2E test file for student form (update or add scenarios)

## Legacy data handling

Existing students may have weaknesses that don't appear in their language's list (e.g., a Spanish student with "phrasal verbs" saved before this fix). These values:
- Remain stored in the DB unchanged
- Display as chips in the MultiSelect (MultiSelect shows any selected value even if not in options)
- Can be manually removed by the teacher
- No migration or cleanup needed
