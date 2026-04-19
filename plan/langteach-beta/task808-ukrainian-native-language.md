# Task 808 — Fix "Couldn't save" error for Ukrainian (and all non-allowlisted) native languages

## Problem

The backend `StudentService.AllowedNativeLanguages` only contains 11 languages (the old `NATIVE_LANGUAGES` list). The frontend uses `ALL_LANGUAGE_OPTIONS` (56 languages) for the Native Languages field. Any language from `ALL_LANGUAGES` that is not in the backend allowlist causes a 400 validation error and the "Couldn't save" toast.

Ukrainian is the reported case, but all languages in `ALL_LANGUAGES` outside the 11 original ones are broken.

## Root Cause

`StudentService.AllowedNativeLanguages` was never updated when the frontend's native language combobox was expanded from `NATIVE_LANGUAGES` to `ALL_LANGUAGES`.

## Fix

### 1. Backend — `StudentService.cs` (line 14-18)

Replace the 11-item allowlist with all languages from `ALL_LANGUAGES`. The new set:

```
Afrikaans, Albanian, Amharic, Arabic, Armenian, Azerbaijani,
Basque, Belarusian, Bengali, Bosnian, Bulgarian,
Catalan, "Chinese (Cantonese)", "Chinese (Mandarin)", Croatian, Czech,
Danish, Dutch,
English, Estonian,
Farsi, Finnish, French,
Galician, Georgian, German, Greek, Gujarati,
Hebrew, Hindi, Hungarian,
Icelandic, Indonesian, Italian,
Japanese,
Kannada, Kazakh, Korean,
Latvian, Lithuanian,
Macedonian, Malay, Maltese, Mandarin, Marathi,
Nepali, Norwegian,
Pashto, Polish, Portuguese, Punjabi,
Romanian, Russian,
Serbian, Sinhalese, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish,
Tagalog, Tamil, Telugu, Thai, Turkish,
Ukrainian, Urdu, Uzbek,
Vietnamese,
Welsh,
Yoruba,
Zulu,
Other
```

Update the comment to reference `ALL_LANGUAGES` instead of `NATIVE_LANGUAGES`.

### 2. DTO comments — `CreateStudentRequest.cs` and `UpdateStudentRequest.cs` (line 21-22)

Update the "Must stay in sync" comment to say `ALL_LANGUAGES` instead of `NATIVE_LANGUAGES`.

### 3. DemoSeeder — `DemoSeeder.cs`

Update "Ana Visual" student's `NativeLanguages` to `["Portuguese","Ukrainian"]` so the visual spec renders and verifies a Ukrainian chip.

### 4. Backend unit test — `StudentsControllerTests.cs` or `StudentServiceTests.cs`

Add a test verifying that Ukrainian is accepted in `ValidateNativeLanguages` (or update an existing allowlist test).

### 5. E2e test — `students.spec.ts` or new `native-language-save.spec.ts`

Add a test that selects Ukrainian as native language via the Edit Student form, saves, reloads, and verifies the chip persists.

## Acceptance Criteria

- [ ] Selecting Ukrainian in the Native Languages field saves without error
- [ ] The Ukrainian chip persists after page reload
- [ ] All languages in `ALL_LANGUAGES` are accepted by the backend (not just Ukrainian)
- [ ] Existing language selections still save correctly
- [ ] DemoSeeder visual seed includes Ukrainian so review-ui can verify it
- [ ] Backend unit test covers the expanded allowlist
- [ ] E2e happy path test for Ukrainian save

## Out of Scope

- Adding languages not in `ALL_LANGUAGES`
- UI or ordering changes to the dropdown

## Review Routing

- area:backend — architecture-reviewer
- area:frontend — review-ui agent (students edit screen)
