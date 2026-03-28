import type { ContentBlockType } from '../types/contentTypes'
import type { SectionType } from '../api/lessons'

// Section-specific display labels for content types (overrides generic label)
const SECTION_CONTENT_TYPE_LABELS: Partial<Record<SectionType, Partial<Record<ContentBlockType, string>>>> = {
  WarmUp: { conversation: 'Conversation starter' },
  WrapUp: { conversation: 'Reflection' },
}

export function getAllowedContentTypes(
  sectionType: SectionType,
  cefrLevel: string
): ContentBlockType[] {
  switch (sectionType) {
    case 'WarmUp':
      return ['conversation']
    case 'Presentation':
      return ['grammar', 'vocabulary', 'reading', 'conversation', 'free-text']
    case 'Practice':
      return ['exercises', 'conversation']
    case 'Production': {
      // B2 and above: reading may be used as a stimulus
      const isB2Plus = cefrLevel === 'B2' || cefrLevel.startsWith('C')
      return isB2Plus ? ['conversation', 'reading'] : ['conversation']
    }
    case 'WrapUp':
      return ['conversation']
    default:
      return ['vocabulary', 'grammar', 'exercises', 'conversation', 'reading', 'homework', 'free-text']
  }
}

/**
 * Returns the display label for a content type within a specific section.
 * Falls back to the generic label if no section-specific override exists.
 */
export function getContentTypeLabel(
  sectionType: SectionType,
  contentType: ContentBlockType,
  genericLabel: string
): string {
  return SECTION_CONTENT_TYPE_LABELS[sectionType]?.[contentType] ?? genericLabel
}
