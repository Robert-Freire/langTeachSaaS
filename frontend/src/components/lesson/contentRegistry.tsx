import type { ContentBlockType } from '../../types/contentTypes'
import { ConversationRenderer } from './renderers/ConversationRenderer'
import { ErrorCorrectionRenderer } from './renderers/ErrorCorrectionRenderer'
import { ExercisesRenderer } from './renderers/ExercisesRenderer'
import { FreeTextRenderer } from './renderers/FreeTextRenderer'
import { GrammarRenderer } from './renderers/GrammarRenderer'
import { GuidedWritingRenderer } from './renderers/GuidedWritingRenderer'
import { HomeworkRenderer } from './renderers/HomeworkRenderer'
import { ReadingRenderer } from './renderers/ReadingRenderer'
import { NoticingTaskRenderer } from './renderers/NoticingTaskRenderer'
import { VocabularyRenderer } from './renderers/VocabularyRenderer'

export interface EditorProps {
  rawContent: string
  parsedContent: unknown
  onChange: (newRaw: string) => void
  onRegenerate?: () => void
  isIncomplete?: boolean
}

export interface PreviewProps {
  rawContent: string
  parsedContent: unknown
}

export interface StudentProps {
  rawContent: string
  parsedContent: unknown
}

export interface ContentRenderer {
  Editor: React.ComponentType<EditorProps>
  Preview: React.ComponentType<PreviewProps>
  Student: React.ComponentType<StudentProps>
  coerce?: (v: unknown) => unknown
}

const registry: Partial<Record<ContentBlockType, ContentRenderer>> = {
  conversation: ConversationRenderer,
  'error-correction': ErrorCorrectionRenderer,
  exercises: ExercisesRenderer,
  'free-text': FreeTextRenderer,
  grammar: GrammarRenderer,
  'guided-writing': GuidedWritingRenderer,
  homework: HomeworkRenderer,
  'noticing-task': NoticingTaskRenderer,
  reading: ReadingRenderer,
  vocabulary: VocabularyRenderer,
}

export function getRenderer(blockType: ContentBlockType): ContentRenderer {
  return registry[blockType] ?? FreeTextRenderer
}
