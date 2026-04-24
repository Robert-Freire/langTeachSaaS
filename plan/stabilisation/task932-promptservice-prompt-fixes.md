# Task 932: PromptService prompt fixes

## Problem

Three prompt-health issues found during sprint close review:

1. `reasonForStudying` duplicated: appeared as a data-fact line (`- Reason for studying X: Y`) AND inside the personalization directive (`anchor vocabulary to their stated study motivation: Y`).
2. Native-language instructional bullets (`- For grammar explanations...`, `- Flag false cognates...`, `- Be aware of common errors...`) were mixed into the personalization instruction paragraph despite using bullet format, corrupting the signal of both sections.
3. CEFR priority cue gated on `officialCefr.Length > 0` -- students without an official CEFR level got no guidance on which level to use.

## Fix

**Fix 1:** Removed the `- Reason for studying {language}: {reasonForStudying}` data-fact line. The personalization directive form is kept as it is more actionable.

**Fix 2:** Moved the three native-language instructional bullets from the personalization instruction paragraph into the student profile data block, immediately after `- Native language: {nativeLang}`. They remain as bullet items (appropriate in the data block).

**Fix 3:** Changed `if (officialCefr.Length > 0)` to `if (!string.IsNullOrEmpty(cefrLevel))` so the cue fires whenever a teacher assessment level is set, regardless of whether an official CEFR level is present.

## Tests added

- `ReasonForStudying_AppearsExactlyOnce_AsDirectiveNotDataFact` -- verifies single occurrence, in directive form, not as data fact
- `NativeLanguageBullets_AppearInProfileBlock_BeforePersonalizationParagraph` -- verifies bullets appear before the personalization paragraph
- `CefrPriorityCue_EmittedWithoutOfficialCefrLevel` -- verifies the cue fires even when `StudentOfficialCefrLevel` is null

All 1152 tests pass.
