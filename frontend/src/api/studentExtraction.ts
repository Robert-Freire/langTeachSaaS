import { apiClient } from '../lib/apiClient'

export interface ExtractedObjective {
  text: string
  targetDate: string | null
}

export interface ExtractedDifficulty {
  description: string
  competency: string
  subcategory: string
}

export interface ExtractedStudentProfile {
  name: string | null
  birthYear: number | null
  profession: string | null
  countryOfResidence: string | null
  cityOfResidence: string | null
  reasonForStudying: string | null
  nativeLanguages: string[]
  spokenLanguages: string[]
  cefrLevel: string | null
  officialCefrLevel: string | null
  shortTermObjectives: ExtractedObjective[]
  difficulties: ExtractedDifficulty[]
  teachingTodoTexts: string[]
  interests: string[]
}

export async function extractStudentProfile(text: string): Promise<ExtractedStudentProfile> {
  const res = await apiClient.post<ExtractedStudentProfile>('/api/students/extract-profile', { text })
  return res.data
}
