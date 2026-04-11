// Option values are the canonical strings stored in the DB and injected into AI prompts.
// Labels are the display strings shown in the UI.
//
// COMPETENCY_OPTIONS and SEVERITY_LEVELS must stay in sync with
// data/pedagogy/difficulty-taxonomy.json (the backend source of truth).
// The frontend cannot read that file at build time, so this is a manual mirror.
//
// To add options: update difficulty-taxonomy.json AND this file together.

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

export const COMPETENCY_OPTIONS: Option[] = [
  { value: 'Grammar', label: 'Grammar' },
  { value: 'Vocabulary', label: 'Vocabulary' },
  { value: 'Pronunciation', label: 'Pronunciation' },
  { value: 'Interaction', label: 'Interaction' },
  { value: 'Discourse', label: 'Discourse' },
  { value: 'Mediation', label: 'Mediation' },
]

export const SEVERITY_LEVELS: Option[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]
