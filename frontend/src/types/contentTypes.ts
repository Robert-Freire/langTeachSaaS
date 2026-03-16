export type ContentBlockType =
  | 'lesson-plan'
  | 'vocabulary'
  | 'grammar'
  | 'exercises'
  | 'conversation'
  | 'reading'
  | 'homework'

export interface VocabularyItem {
  word: string
  definition: string
  exampleSentence?: string
}

export interface VocabularyContent {
  items: VocabularyItem[]
}

export interface GrammarExample {
  sentence: string
  note?: string
}

export interface GrammarContent {
  title: string
  explanation: string
  examples: GrammarExample[]
  commonMistakes: string[]
}

export interface ExercisesFillInBlank {
  sentence: string
  answer: string
  hint?: string
}

export interface ExercisesMultipleChoice {
  question: string
  options: string[]
  answer: string
}

export interface ExercisesMatching {
  left: string
  right: string
}

export interface ExercisesContent {
  fillInBlank: ExercisesFillInBlank[]
  multipleChoice: ExercisesMultipleChoice[]
  matching: ExercisesMatching[]
}

export interface ConversationScenario {
  setup: string
  roleA: string
  roleB: string
  roleAPhrases: string[]
  roleBPhrases: string[]
  /** @deprecated use roleAPhrases/roleBPhrases — kept for backward compat with old lessons */
  keyPhrases?: string[]
}

export interface ConversationContent {
  scenarios: ConversationScenario[]
}

export interface ReadingVocabHighlight {
  word: string
  definition: string
}

export interface ReadingQuestion {
  question: string
  answer: string
  type: string
}

export interface ReadingContent {
  passage: string
  comprehensionQuestions: ReadingQuestion[]
  vocabularyHighlights: ReadingVocabHighlight[]
}

export interface HomeworkTask {
  type: string
  instructions: string
  examples: string[]
}

export interface HomeworkContent {
  tasks: HomeworkTask[]
}

export interface LessonPlanSections {
  warmUp: string
  presentation: string
  practice: string
  production: string
  wrapUp: string
}

export interface LessonPlanContent {
  title: string
  objectives: string[]
  sections: LessonPlanSections
}

export function isVocabularyContent(v: unknown): v is VocabularyContent {
  return typeof v === 'object' && v !== null && 'items' in v && Array.isArray((v as VocabularyContent).items)
}

export function isGrammarContent(v: unknown): v is GrammarContent {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  return typeof c.title === 'string' && typeof c.explanation === 'string' && Array.isArray(c.examples) && Array.isArray(c.commonMistakes)
}

export function isExercisesContent(v: unknown): v is ExercisesContent {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  return Array.isArray(c.fillInBlank) && Array.isArray(c.multipleChoice) && Array.isArray(c.matching)
}

export function isConversationContent(v: unknown): v is ConversationContent {
  return typeof v === 'object' && v !== null && 'scenarios' in v && Array.isArray((v as ConversationContent).scenarios)
}

export function isReadingContent(v: unknown): v is ReadingContent {
  return typeof v === 'object' && v !== null && 'passage' in v
}

export function isHomeworkContent(v: unknown): v is HomeworkContent {
  return typeof v === 'object' && v !== null && 'tasks' in v && Array.isArray((v as HomeworkContent).tasks)
}

export function isLessonPlanContent(v: unknown): v is LessonPlanContent {
  return typeof v === 'object' && v !== null && 'sections' in v && 'objectives' in v
}
