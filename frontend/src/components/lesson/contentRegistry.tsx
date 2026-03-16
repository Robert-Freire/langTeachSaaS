import type { ContentBlockType } from '../../types/contentTypes'
import { ExercisesRenderer } from './renderers/ExercisesRenderer'
import { FreeTextRenderer } from './renderers/FreeTextRenderer'
import { VocabularyRenderer } from './renderers/VocabularyRenderer'

export interface EditorProps {
  rawContent: string
  parsedContent: unknown
  onChange: (newRaw: string) => void
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
}

const registry: Partial<Record<ContentBlockType, ContentRenderer>> = {
  exercises: ExercisesRenderer,
  vocabulary: VocabularyRenderer,
}

export function getRenderer(blockType: ContentBlockType): ContentRenderer {
  return registry[blockType] ?? FreeTextRenderer
}
