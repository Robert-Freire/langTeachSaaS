export type ContentBlockType =
  | 'lesson-plan'
  | 'vocabulary'
  | 'grammar'
  | 'exercises'
  | 'conversation'
  | 'reading'
  | 'homework'
  | 'free-text'
  | 'guided-writing'
  | 'error-correction'
  | 'noticing-task'

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

export interface L1ContrastiveNote {
  l1Example: string
  targetExample: string
  explanation: string
  interferencePattern: string
}

export interface GrammarContent {
  title: string
  explanation: string
  examples: GrammarExample[]
  commonMistakes: string[]
  l1ContrastiveNote?: L1ContrastiveNote
}

export type PracticeStage = 'controlled' | 'meaningful' | 'guided_free'

export interface ExercisesFillInBlank {
  sentence: string
  answer: string
  hint?: string
  explanation?: string
  stage?: PracticeStage
}

export interface ExercisesMultipleChoice {
  question: string
  options: string[]
  answer: string
  explanation?: string
  stage?: PracticeStage
}

export interface ExercisesMatching {
  left: string
  right: string
  explanation?: string
  stage?: PracticeStage
}

export interface ExercisesTrueFalse {
  statement: string
  isTrue: boolean
  justification: string
  sourcePassage?: string
  stage?: PracticeStage
}

export interface ExercisesSentenceOrdering {
  fragments: string[]
  correctOrder: number[]
  hint?: string
  explanation?: string
  stage?: PracticeStage
}

export interface ExercisesSentenceTransformation {
  prompt: string
  original: string
  expected: string
  alternatives?: string[]
  explanation?: string
  stage?: PracticeStage
}

export interface ExercisesContent {
  fillInBlank: ExercisesFillInBlank[]
  multipleChoice: ExercisesMultipleChoice[]
  matching: ExercisesMatching[]
  trueFalse?: ExercisesTrueFalse[]
  sentenceOrdering?: ExercisesSentenceOrdering[]
  sentenceTransformation?: ExercisesSentenceTransformation[]
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

export interface GuidedWritingWordCount {
  min: number
  max: number
}

export interface GuidedWritingContent {
  situation: string
  requiredStructures: string[]
  wordCount: GuidedWritingWordCount
  evaluationCriteria: string[]
  modelAnswer: string
  tips?: string[]
}

export type ErrorCorrectionMode = 'identify-only' | 'identify-and-correct'
export type ErrorCorrectionErrorType = 'grammar' | 'vocabulary' | 'spelling' | 'verbForm' | 'agreement' | 'wordOrder'

export interface ErrorCorrectionItem {
  sentence: string
  errorSpan: [number, number]
  correction: string
  errorType: ErrorCorrectionErrorType
  explanation?: string
}

export interface ErrorCorrectionContent {
  mode: ErrorCorrectionMode
  items: ErrorCorrectionItem[]
}

export interface NoticingTaskTarget {
  form: string
  position: [number, number]
  grammar: string
}

export interface NoticingTaskContent {
  text: string
  instruction: string
  targets: NoticingTaskTarget[]
  discoveryQuestions: string[]
  teacherNotes?: string
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

function isL1ContrastiveNote(v: unknown): v is L1ContrastiveNote {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  return typeof c.l1Example === 'string' && typeof c.targetExample === 'string' &&
    typeof c.explanation === 'string' && typeof c.interferencePattern === 'string'
}

export function isGrammarContent(v: unknown): v is GrammarContent {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  if (!(typeof c.title === 'string' && typeof c.explanation === 'string' && Array.isArray(c.examples) && Array.isArray(c.commonMistakes)))
    return false
  if (c.l1ContrastiveNote !== undefined && !isL1ContrastiveNote(c.l1ContrastiveNote))
    return false
  return true
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

export function isGuidedWritingContent(v: unknown): v is GuidedWritingContent {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  return (
    typeof c.situation === 'string' &&
    Array.isArray(c.requiredStructures) &&
    typeof c.wordCount === 'object' && c.wordCount !== null &&
    Array.isArray(c.evaluationCriteria) &&
    typeof c.modelAnswer === 'string'
  )
}

const VALID_EC_ERROR_TYPES = new Set(['grammar', 'vocabulary', 'spelling', 'verbForm', 'agreement', 'wordOrder'])
const VALID_EC_MODES = new Set(['identify-only', 'identify-and-correct'])

export function isErrorCorrectionContent(v: unknown): v is ErrorCorrectionContent {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  return (
    VALID_EC_MODES.has(c.mode as string) &&
    Array.isArray(c.items) &&
    c.items.every((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false
      const it = item as Record<string, unknown>
      return (
        typeof it.sentence === 'string' &&
        Array.isArray(it.errorSpan) && it.errorSpan.length === 2 &&
        typeof it.errorSpan[0] === 'number' && typeof it.errorSpan[1] === 'number' &&
        typeof it.correction === 'string' &&
        VALID_EC_ERROR_TYPES.has(it.errorType as string)
      )
    })
  )
}

export function isNoticingTaskContent(v: unknown): v is NoticingTaskContent {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  return (
    typeof c.text === 'string' &&
    typeof c.instruction === 'string' &&
    Array.isArray(c.targets) &&
    c.targets.length > 0 &&
    c.targets.every((t: unknown) => {
      if (typeof t !== 'object' || t === null) return false
      const tgt = t as Record<string, unknown>
      return (
        typeof tgt.form === 'string' &&
        Array.isArray(tgt.position) && tgt.position.length === 2 &&
        typeof tgt.position[0] === 'number' && typeof tgt.position[1] === 'number' &&
        typeof tgt.grammar === 'string'
      )
    }) &&
    Array.isArray(c.discoveryQuestions) &&
    c.discoveryQuestions.length > 0 &&
    c.discoveryQuestions.every((q: unknown) => typeof q === 'string')
  )
}

export function isLessonPlanContent(v: unknown): v is LessonPlanContent {
  return typeof v === 'object' && v !== null && 'sections' in v && 'objectives' in v
}

// ─── Coerce functions ─────────────────────────────────────────────────────────
// Each coerce function attempts to normalise common AI schema mismatches into the
// expected shape. Returns the coerced value if it passes the type guard, or null.

/** Unwrap the first nested object value that matches the type guard. */
function unwrapWrapper<T>(obj: Record<string, unknown>, guard: (v: unknown) => v is T): T | null {
  for (const key of Object.keys(obj)) {
    const child = obj[key]
    if (typeof child === 'object' && child !== null && guard(child)) return child as T
  }
  return null
}

function normalizeVocabularyItems(arr: unknown[]): VocabularyContent | null {
  const items = arr
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      word: String(item.word ?? item.term ?? item.target ?? ''),
      definition: String(item.definition ?? item.meaning ?? item.translation ?? ''),
      exampleSentence: item.exampleSentence != null ? String(item.exampleSentence)
        : item.example != null ? String(item.example)
        : item.sentence != null ? String(item.sentence)
        : undefined,
    }))
  const candidate = { items }
  return isVocabularyContent(candidate) ? candidate : null
}

export function coerceVocabularyContent(v: unknown): VocabularyContent | null {
  // Array directly -> normalize items
  if (Array.isArray(v)) return normalizeVocabularyItems(v)

  if (typeof v !== 'object' || v === null) return null

  const obj = v as Record<string, unknown>

  // Object with items array -> normalize items (handles field renames + valid schemas)
  if (Array.isArray(obj.items)) return normalizeVocabularyItems(obj.items)

  // Unwrap extra wrapper key: { vocabulary: { items: [...] } }
  for (const key of Object.keys(obj)) {
    const child = obj[key]
    if (typeof child === 'object' && child !== null && !Array.isArray(child)) {
      const result = coerceVocabularyContent(child)
      if (result) return result
    }
  }

  return null
}

export function coerceGrammarContent(v: unknown): GrammarContent | null {
  if (isGrammarContent(v)) return v
  if (typeof v !== 'object' || v === null) return null
  const obj = v as Record<string, unknown>

  // Unwrap extra wrapper key
  const unwrapped = unwrapWrapper(obj, isGrammarContent)
  if (unwrapped) return unwrapped

  // Only attempt field remapping if at least one recognized key is present
  const hasRecognizedField =
    obj.title != null || obj.heading != null || obj.name != null ||
    obj.explanation != null || obj.description != null || obj.summary != null ||
    Array.isArray(obj.examples) || Array.isArray(obj.commonMistakes) ||
    Array.isArray(obj.mistakes) || Array.isArray(obj.errors)
  if (!hasRecognizedField) return null

  const candidate: Record<string, unknown> = {
    title: obj.title ?? obj.heading ?? obj.name ?? '',
    explanation: obj.explanation ?? obj.description ?? obj.summary ?? '',
    examples: Array.isArray(obj.examples) ? obj.examples : [],
    commonMistakes: Array.isArray(obj.commonMistakes) ? obj.commonMistakes
      : Array.isArray(obj.mistakes) ? obj.mistakes
      : Array.isArray(obj.errors) ? obj.errors
      : [],
    ...(isL1ContrastiveNote(obj.l1ContrastiveNote) ? { l1ContrastiveNote: obj.l1ContrastiveNote } : {}),
  }
  if (isGrammarContent(candidate)) return candidate as GrammarContent
  return null
}

export function coerceExercisesContent(v: unknown): ExercisesContent | null {
  if (isExercisesContent(v)) return v
  if (typeof v !== 'object' || v === null) return null
  const obj = v as Record<string, unknown>

  // Unwrap extra wrapper key
  const unwrapped = unwrapWrapper(obj, isExercisesContent)
  if (unwrapped) return unwrapped

  // Only attempt to fill missing arrays if at least one recognized key is present
  const hasRecognizedField =
    Array.isArray(obj.fillInBlank) || Array.isArray(obj.fill_in_blank) ||
    Array.isArray(obj.multipleChoice) || Array.isArray(obj.multiple_choice) ||
    Array.isArray(obj.matching) ||
    Array.isArray(obj.trueFalse) || Array.isArray(obj.true_false) ||
    Array.isArray(obj.sentenceOrdering) || Array.isArray(obj.sentence_ordering) ||
    Array.isArray(obj.sentenceTransformation) || Array.isArray(obj.sentence_transformation)
  if (!hasRecognizedField) return null

  const rawSo = Array.isArray(obj.sentenceOrdering) ? obj.sentenceOrdering
    : Array.isArray(obj.sentence_ordering) ? obj.sentence_ordering
    : undefined

  const rawSt = Array.isArray(obj.sentenceTransformation) ? obj.sentenceTransformation
    : Array.isArray(obj.sentence_transformation) ? obj.sentence_transformation
    : undefined

  const candidate = {
    fillInBlank: Array.isArray(obj.fillInBlank) ? obj.fillInBlank
      : Array.isArray(obj.fill_in_blank) ? obj.fill_in_blank
      : [],
    multipleChoice: Array.isArray(obj.multipleChoice) ? obj.multipleChoice
      : Array.isArray(obj.multiple_choice) ? obj.multiple_choice
      : [],
    matching: Array.isArray(obj.matching) ? obj.matching : [],
    trueFalse: Array.isArray(obj.trueFalse) ? obj.trueFalse
      : Array.isArray(obj.true_false) ? obj.true_false
      : [],
    sentenceOrdering: rawSo
      ? rawSo.filter((item: unknown): item is ExercisesSentenceOrdering => {
          if (typeof item !== 'object' || item === null) return false
          const it = item as Record<string, unknown>
          return Array.isArray(it.fragments) && Array.isArray(it.correctOrder) &&
            it.fragments.length === it.correctOrder.length
        })
      : undefined,
    sentenceTransformation: rawSt
      ? rawSt.filter((item: unknown): item is ExercisesSentenceTransformation => {
          if (typeof item !== 'object' || item === null) return false
          const it = item as Record<string, unknown>
          return typeof it.prompt === 'string' && typeof it.original === 'string' &&
            typeof it.expected === 'string'
        })
      : undefined,
  }
  if (isExercisesContent(candidate)) return candidate
  return null
}

export function coerceConversationContent(v: unknown): ConversationContent | null {
  if (isConversationContent(v)) return v
  if (typeof v !== 'object' || v === null) return null
  const obj = v as Record<string, unknown>

  // Unwrap extra wrapper key
  const unwrapped = unwrapWrapper(obj, isConversationContent)
  if (unwrapped) return unwrapped

  // Array directly -> wrap as scenarios
  if (Array.isArray(v)) {
    const candidate = { scenarios: v }
    if (isConversationContent(candidate)) return candidate
  }

  // Single scenario object -> wrap in array
  if ('setup' in obj || 'roleA' in obj) {
    const candidate = { scenarios: [obj] }
    if (isConversationContent(candidate)) return candidate
  }

  return null
}

export function coerceReadingContent(v: unknown): ReadingContent | null {
  if (typeof v !== 'object' || v === null) return null
  const obj = v as Record<string, unknown>

  if (isReadingContent(v)) {
    // Fill missing arrays
    return {
      passage: String(obj.passage ?? ''),
      comprehensionQuestions: Array.isArray(obj.comprehensionQuestions) ? obj.comprehensionQuestions as ReadingQuestion[] : [],
      vocabularyHighlights: Array.isArray(obj.vocabularyHighlights) ? obj.vocabularyHighlights as ReadingVocabHighlight[] : [],
    }
  }

  // Unwrap extra wrapper key
  const unwrapped = unwrapWrapper(obj, isReadingContent)
  if (unwrapped) return coerceReadingContent(unwrapped)

  // Has passage field
  if (typeof obj.passage === 'string') {
    return {
      passage: obj.passage,
      comprehensionQuestions: Array.isArray(obj.comprehensionQuestions) ? obj.comprehensionQuestions as ReadingQuestion[] : [],
      vocabularyHighlights: Array.isArray(obj.vocabularyHighlights) ? obj.vocabularyHighlights as ReadingVocabHighlight[] : [],
    }
  }

  return null
}

export function coerceHomeworkContent(v: unknown): HomeworkContent | null {
  if (isHomeworkContent(v)) return v
  if (typeof v !== 'object' || v === null) return null
  const obj = v as Record<string, unknown>

  // Unwrap extra wrapper key
  const unwrapped = unwrapWrapper(obj, isHomeworkContent)
  if (unwrapped) return unwrapped

  // Array directly -> wrap as tasks
  if (Array.isArray(v)) {
    const candidate = { tasks: v }
    if (isHomeworkContent(candidate)) return candidate
  }

  return null
}

export function coerceGuidedWritingContent(v: unknown): GuidedWritingContent | null {
  if (isGuidedWritingContent(v)) return v
  if (typeof v !== 'object' || v === null) return null
  const obj = v as Record<string, unknown>

  // Unwrap extra wrapper key
  const unwrapped = unwrapWrapper(obj, isGuidedWritingContent)
  if (unwrapped) return unwrapped

  // Only attempt field normalisation if at least one recognized key is present
  const hasRecognizedField =
    obj.situation != null || obj.requiredStructures != null || obj.modelAnswer != null
  if (!hasRecognizedField) return null

  const rawWc = typeof obj.wordCount === 'object' && obj.wordCount !== null
    ? obj.wordCount as Record<string, unknown>
    : {}

  const candidate: GuidedWritingContent = {
    situation: typeof obj.situation === 'string' ? obj.situation : '',
    requiredStructures: Array.isArray(obj.requiredStructures) ? obj.requiredStructures as string[] : [],
    wordCount: {
      min: typeof rawWc.min === 'number' ? rawWc.min : 50,
      max: typeof rawWc.max === 'number' ? rawWc.max : 100,
    },
    evaluationCriteria: Array.isArray(obj.evaluationCriteria) ? obj.evaluationCriteria as string[] : [],
    modelAnswer: typeof obj.modelAnswer === 'string' ? obj.modelAnswer : '',
    tips: Array.isArray(obj.tips) ? obj.tips as string[] : undefined,
  }
  return isGuidedWritingContent(candidate) ? candidate : null
}

export function coerceErrorCorrectionContent(v: unknown): ErrorCorrectionContent | null {
  if (isErrorCorrectionContent(v)) return v
  if (typeof v !== 'object' || v === null) return null
  const obj = v as Record<string, unknown>

  // Unwrap extra wrapper key
  const unwrapped = unwrapWrapper(obj, isErrorCorrectionContent)
  if (unwrapped) return unwrapped

  // Only attempt normalization if recognized keys are present
  if (!Array.isArray(obj.items) && !Array.isArray(obj.errors)) return null

  const rawItems = Array.isArray(obj.items) ? obj.items : (obj.errors as unknown[])
  const items = rawItems
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      sentence: typeof item.sentence === 'string' ? item.sentence : '',
      errorSpan: Array.isArray(item.errorSpan) && item.errorSpan.length >= 2
        ? [Number(item.errorSpan[0]), Number(item.errorSpan[1])] as [number, number]
        : [0, 0] as [number, number],
      correction: typeof item.correction === 'string' ? item.correction : '',
      errorType: (VALID_EC_ERROR_TYPES.has(String(item.errorType)) ? item.errorType : 'grammar') as ErrorCorrectionErrorType,
      explanation: typeof item.explanation === 'string' ? item.explanation : undefined,
    }))

  const rawMode = String(obj.mode ?? '')
  const mode: ErrorCorrectionMode = VALID_EC_MODES.has(rawMode) ? (rawMode as ErrorCorrectionMode) : 'identify-and-correct'

  const candidate: ErrorCorrectionContent = { mode, items }
  return isErrorCorrectionContent(candidate) ? candidate : null
}

export function coerceNoticingTaskContent(v: unknown): NoticingTaskContent | null {
  if (isNoticingTaskContent(v)) return v
  if (typeof v !== 'object' || v === null) return null
  const obj = v as Record<string, unknown>

  const unwrapped = unwrapWrapper(obj, isNoticingTaskContent)
  if (unwrapped) return unwrapped

  if (typeof obj.text !== 'string' || typeof obj.instruction !== 'string') return null
  if (!Array.isArray(obj.targets) || !Array.isArray(obj.discoveryQuestions)) return null

  const targets = (obj.targets as unknown[])
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => ({
      form: typeof t.form === 'string' ? t.form : '',
      position: Array.isArray(t.position) && t.position.length >= 2
        ? [Number(t.position[0]), Number(t.position[1])] as [number, number]
        : [0, 0] as [number, number],
      grammar: typeof t.grammar === 'string' ? t.grammar : '',
    }))

  const discoveryQuestions = (obj.discoveryQuestions as unknown[])
    .filter((q): q is string => typeof q === 'string')

  if (targets.length === 0 || discoveryQuestions.length === 0) return null

  const candidate: NoticingTaskContent = {
    text: obj.text as string,
    instruction: obj.instruction as string,
    targets,
    discoveryQuestions,
    teacherNotes: typeof obj.teacherNotes === 'string' ? obj.teacherNotes : undefined,
  }
  return isNoticingTaskContent(candidate) ? candidate : null
}
