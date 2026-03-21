// Option values are the canonical strings stored in the DB and injected into AI prompts.
// Labels are the display strings shown in the UI.
//
// NOTE: The WEAKNESSES list uses European-language grammar terminology.
// For students learning Japanese, Arabic, or other non-European languages, different
// categories apply (e.g. pitch accent, particles, script systems). Extend this list
// or migrate to a DB-backed approach if non-European language support is added.
//
// To add options: append to the relevant array here. No other file needs to change.
// To migrate to combobox/custom entries: swap the component in StudentForm.tsx.

export const LEARNING_GOALS: { value: string; label: string }[] = [
  { value: 'conversation', label: 'Conversation' },
  { value: 'business', label: 'Business' },
  { value: 'travel', label: 'Travel' },
  { value: 'exams', label: 'Exams' },
  { value: 'pronunciation', label: 'Pronunciation' },
  { value: 'writing', label: 'Writing' },
  { value: 'reading', label: 'Reading' },
]

export const WEAKNESSES: { value: string; label: string }[] = [
  { value: 'past tenses', label: 'Past Tenses' },
  { value: 'articles', label: 'Articles' },
  { value: 'subjunctive', label: 'Subjunctive' },
  { value: 'conditionals', label: 'Conditionals' },
  { value: 'phrasal verbs', label: 'Phrasal Verbs' },
  { value: 'pronunciation', label: 'Pronunciation' },
  { value: 'word order', label: 'Word Order' },
  { value: 'gender agreement', label: 'Gender Agreement' },
  { value: 'reported speech', label: 'Reported Speech' },
  { value: 'vocabulary range', label: 'Vocabulary Range' },
]

export const DIFFICULTY_CATEGORIES: { value: string; label: string }[] = [
  { value: 'grammar', label: 'Grammar' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'pronunciation', label: 'Pronunciation' },
  { value: 'writing', label: 'Writing' },
  { value: 'comprehension', label: 'Comprehension' },
]

export const SEVERITY_LEVELS: { value: string; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export const TREND_OPTIONS: { value: string; label: string }[] = [
  { value: 'improving', label: 'Improving' },
  { value: 'stable', label: 'Stable' },
  { value: 'declining', label: 'Declining' },
]
