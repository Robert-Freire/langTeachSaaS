// Option values are the canonical strings stored in the DB and injected into AI prompts.
// Labels are the display strings shown in the UI.
//
// To add options: append to the relevant array here. No other file needs to change.

type Option = { value: string; label: string }

export const LEARNING_GOALS: Option[] = [
  { value: 'conversation', label: 'Conversation' },
  { value: 'business', label: 'Business' },
  { value: 'travel', label: 'Travel' },
  { value: 'exams', label: 'Exams' },
  { value: 'pronunciation', label: 'Pronunciation' },
  { value: 'writing', label: 'Writing' },
  { value: 'reading', label: 'Reading' },
]

// Common weaknesses applicable to all languages
const COMMON_WEAKNESSES: Option[] = [
  { value: 'past tenses', label: 'Past Tenses' },
  { value: 'pronunciation', label: 'Pronunciation' },
  { value: 'vocabulary range', label: 'Vocabulary Range' },
  { value: 'listening comprehension', label: 'Listening Comprehension' },
  { value: 'reading comprehension', label: 'Reading Comprehension' },
]

// Language-specific weaknesses, merged with common when displayed
const WEAKNESSES_BY_LANGUAGE: Record<string, Option[]> = {
  English: [
    { value: 'articles', label: 'Articles' },
    { value: 'phrasal verbs', label: 'Phrasal Verbs' },
    { value: 'conditionals', label: 'Conditionals' },
    { value: 'reported speech', label: 'Reported Speech' },
    { value: 'prepositions', label: 'Prepositions' },
  ],
  Spanish: [
    { value: 'ser/estar', label: 'Ser/Estar' },
    { value: 'subjunctive', label: 'Subjunctive' },
    { value: 'por/para', label: 'Por/Para' },
    { value: 'preterite vs imperfect', label: 'Preterite vs Imperfect' },
    { value: 'gender agreement', label: 'Gender Agreement' },
  ],
  French: [
    { value: 'subjunctive', label: 'Subjunctive' },
    { value: 'partitive articles', label: 'Partitive Articles' },
    { value: 'pronoun placement', label: 'Pronoun Placement' },
    { value: 'passe compose vs imparfait', label: 'Pass\u00e9 Compos\u00e9 vs Imparfait' },
    { value: 'gender agreement', label: 'Gender Agreement' },
  ],
  German: [
    { value: 'cases', label: 'Cases (Akkusativ/Dativ)' },
    { value: 'word order', label: 'Word Order' },
    { value: 'separable verbs', label: 'Separable Verbs' },
    { value: 'gendered articles', label: 'Gendered Articles' },
    { value: 'adjective declension', label: 'Adjective Declension' },
  ],
}

/**
 * Returns weakness options for a given target language.
 * Merges common weaknesses with language-specific ones.
 * Returns common-only for unknown languages or empty string.
 */
export function getWeaknessesForLanguage(language: string): Option[] {
  const specific = WEAKNESSES_BY_LANGUAGE[language] ?? []
  return [...COMMON_WEAKNESSES, ...specific]
}

/**
 * Returns only the language-specific weakness values for a given language,
 * excluding common weaknesses shared across all languages.
 * Used when changing language to know which selections to clear.
 */
export function getLanguageSpecificWeaknessValues(language: string): Set<string> {
  return new Set((WEAKNESSES_BY_LANGUAGE[language] ?? []).map((o) => o.value))
}

export const DIFFICULTY_CATEGORIES: Option[] = [
  { value: 'grammar', label: 'Grammar' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'pronunciation', label: 'Pronunciation' },
  { value: 'writing', label: 'Writing' },
  { value: 'comprehension', label: 'Comprehension' },
]

export const SEVERITY_LEVELS: Option[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export const TREND_OPTIONS: Option[] = [
  { value: 'improving', label: 'Improving' },
  { value: 'stable', label: 'Stable' },
  { value: 'declining', label: 'Declining' },
]
