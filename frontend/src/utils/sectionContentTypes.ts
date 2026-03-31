import type { ContentBlockType } from '../types/contentTypes'
import type { SectionType } from '../api/lessons'
import type { SectionRulesMap } from '../api/pedagogy'

export type { SectionRulesMap }

// Section-specific display labels for content types (overrides generic label)
const SECTION_CONTENT_TYPE_LABELS: Partial<Record<SectionType, Partial<Record<ContentBlockType, string>>>> = {
  WarmUp: { conversation: 'Conversation starter' },
  WrapUp: { conversation: 'Reflection' },
}

// All content types — shown when rules are not yet loaded (loading fallback)
export const ALL_CONTENT_TYPES: ContentBlockType[] = [
  'vocabulary',
  'grammar',
  'exercises',
  'error-correction',
  'conversation',
  'reading',
  'homework',
  'guided-writing',
  'free-text',
]

/**
 * Normalizes a CEFR level string to its base form (e.g. "B2.1" -> "B2").
 */
export function normalizeLevel(cefrLevel: string): string {
  return cefrLevel.replace(/\.\d+$/, '')
}

/**
 * Returns the allowed content types for a section at the given CEFR level,
 * driven by backend section profile data.
 *
 * - When rules is undefined (loading): returns ALL_CONTENT_TYPES as a safe fallback.
 * - When rules is loaded but the section/level is not found: returns [].
 */
export function getAllowedContentTypes(
  rules: SectionRulesMap | undefined,
  sectionType: SectionType,
  cefrLevel: string
): ContentBlockType[] {
  if (rules === undefined) return ALL_CONTENT_TYPES
  return rules[sectionType]?.[normalizeLevel(cefrLevel)] ?? []
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
