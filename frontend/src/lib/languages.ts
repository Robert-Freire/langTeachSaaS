/**
 * Canonical language lists used across the app.
 * LANGUAGES: target/teaching languages shown in lesson and course forms (compact list).
 * NATIVE_LANGUAGES: learner native languages (adds Catalan for onboarding step 2).
 * ALL_LANGUAGES: comprehensive ISO 639 subset for combobox fields (native, spoken, learning).
 * Update ALL_LANGUAGES when adding a new language; update LANGUAGES/NATIVE_LANGUAGES only
 * if it needs to appear in the compact dropdowns.
 */
export const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other'] as const

export const NATIVE_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Catalan', 'Other'] as const

export const NATIVE_LANGUAGE_OPTIONS = NATIVE_LANGUAGES.map((lang) => ({ value: lang, label: lang }))

/**
 * Comprehensive language list for combobox fields.
 * Covers major world languages by speaker count + common European languages.
 * Custom values are also accepted via the combobox component.
 */
export const ALL_LANGUAGES = [
  'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Azerbaijani',
  'Basque', 'Belarusian', 'Bengali', 'Bosnian', 'Bulgarian',
  'Catalan', 'Chinese (Cantonese)', 'Chinese (Mandarin)', 'Croatian', 'Czech',
  'Danish', 'Dutch',
  'English', 'Estonian',
  'Farsi', 'Finnish', 'French',
  'Galician', 'Georgian', 'German', 'Greek', 'Gujarati',
  'Hebrew', 'Hindi', 'Hungarian',
  'Icelandic', 'Indonesian', 'Italian',
  'Japanese',
  'Kannada', 'Kazakh', 'Korean',
  'Latvian', 'Lithuanian',
  'Macedonian', 'Malay', 'Maltese', 'Mandarin', 'Marathi',
  'Nepali', 'Norwegian',
  'Pashto', 'Polish', 'Portuguese', 'Punjabi',
  'Romanian', 'Russian',
  'Serbian', 'Sinhalese', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Swahili', 'Swedish',
  'Tagalog', 'Tamil', 'Telugu', 'Thai', 'Turkish',
  'Ukrainian', 'Urdu', 'Uzbek',
  'Vietnamese',
  'Welsh',
  'Yoruba',
  'Zulu',
] as const

export const ALL_LANGUAGE_OPTIONS = ALL_LANGUAGES.map((lang) => ({ value: lang, label: lang }))

/** ISO 639-1 code for each known language name. Used for display badges. */
export const LANG_TO_CODE: Record<string, string> = {
  English: 'EN', Spanish: 'ES', French: 'FR', German: 'DE',
  Italian: 'IT', Portuguese: 'PT', Mandarin: 'ZH', Japanese: 'JA',
  Arabic: 'AR', Catalan: 'CA', Other: '??',
  'Chinese (Mandarin)': 'ZH', 'Chinese (Cantonese)': 'ZH',
  Russian: 'RU', Ukrainian: 'UK', Korean: 'KO', Hindi: 'HI',
  Turkish: 'TR', Dutch: 'NL', Polish: 'PL', Swedish: 'SV',
  Danish: 'DA', Norwegian: 'NO', Finnish: 'FI', Greek: 'EL',
  Czech: 'CS', Romanian: 'RO', Hungarian: 'HU', Bulgarian: 'BG',
  Croatian: 'HR', Serbian: 'SR', Slovak: 'SK', Slovenian: 'SL',
  Hebrew: 'HE', Farsi: 'FA', Bengali: 'BN', Vietnamese: 'VI',
  Thai: 'TH', Indonesian: 'ID', Malay: 'MS', Tagalog: 'TL',
  Swahili: 'SW', Yoruba: 'YO', Zulu: 'ZU', Amharic: 'AM',
}
