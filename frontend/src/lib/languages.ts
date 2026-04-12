/**
 * Canonical language lists used across the app.
 * LANGUAGES: target/teaching languages shown in lesson and course forms.
 * NATIVE_LANGUAGES: learner native languages (adds Catalan for onboarding step 2).
 * Update both lists here when adding a new language.
 */
export const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other'] as const

export const NATIVE_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Catalan', 'Other'] as const

export const NATIVE_LANGUAGE_OPTIONS = NATIVE_LANGUAGES.map((lang) => ({ value: lang, label: lang }))

/** ISO 639-1 code for each known language name. Used for display badges. */
export const LANG_TO_CODE: Record<string, string> = {
  English: 'EN', Spanish: 'ES', French: 'FR', German: 'DE',
  Italian: 'IT', Portuguese: 'PT', Mandarin: 'ZH', Japanese: 'JA',
  Arabic: 'AR', Catalan: 'CA', Other: '??',
}
