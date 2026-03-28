import { apiClient } from '../lib/apiClient'
import type { ContentBlockType } from '../types/contentTypes'

// Maps sectionType -> cefrLevel -> allowed ContentBlockTypes
export type SectionRulesMap = Record<string, Record<string, ContentBlockType[]>>

export async function fetchSectionRules(): Promise<SectionRulesMap> {
  const res = await apiClient.get<SectionRulesMap>('/api/pedagogy/section-rules')
  return res.data
}
