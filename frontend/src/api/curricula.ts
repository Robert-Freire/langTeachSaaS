import { apiClient } from '../lib/apiClient'

export interface CurriculumTemplateSummary {
  level: string
  cefrLevel: string
  unitCount: number
  sampleGrammar: string[]
}

export interface CurriculumTemplateData {
  level: string
  cefrLevel: string
  units: CurriculumTemplateUnit[]
}

export interface CurriculumTemplateUnit {
  unitNumber: number
  title: string
  overallGoal: string
  grammar: string[]
  vocabularyThemes: string[]
  communicativeFunctions: string[]
}

export async function getCurriculumTemplates(): Promise<CurriculumTemplateSummary[]> {
  const { data } = await apiClient.get<CurriculumTemplateSummary[]>('/api/curriculum-templates')
  return data
}

export async function getCurriculumTemplate(level: string): Promise<CurriculumTemplateData> {
  const { data } = await apiClient.get<CurriculumTemplateData>(`/api/curriculum-templates/${level}`)
  return data
}
