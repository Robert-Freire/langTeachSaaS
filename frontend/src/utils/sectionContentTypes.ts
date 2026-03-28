import type { ContentBlockType } from '../types/contentTypes'
import type { SectionType } from '../api/lessons'

function isB1Plus(cefrLevel: string): boolean {
  return !cefrLevel.startsWith('A')
}

export function getAllowedContentTypes(
  sectionType: SectionType,
  cefrLevel: string
): ContentBlockType[] {
  switch (sectionType) {
    case 'WarmUp':
      return isB1Plus(cefrLevel) ? ['free-text', 'conversation'] : ['free-text']
    case 'Presentation':
      return ['grammar', 'vocabulary', 'reading', 'conversation', 'free-text']
    case 'Practice':
      return ['exercises', 'conversation']
    case 'Production':
      return ['free-text', 'conversation', 'reading']
    case 'WrapUp':
      return ['free-text']
    default:
      return ['vocabulary', 'grammar', 'exercises', 'conversation', 'reading', 'homework', 'free-text']
  }
}
