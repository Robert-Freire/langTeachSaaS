import { apiClient } from '../lib/apiClient'
import type { ContentBlockType } from '../types/contentTypes'

export type { ContentBlockType }

export interface GenerateRequest {
  lessonId: string
  studentId?: string
  language: string
  cefrLevel: string
  topic: string
  style?: string
  existingNotes?: string
  direction?: string
  grammarConstraints?: string
  sectionType?: string
}

export interface TargetedDifficulty {
  category: string
  item: string
  severity: string
}

export type GenerateStatus = 'idle' | 'streaming' | 'done' | 'error'

export interface ContentBlockDto {
  id: string
  lessonSectionId: string | null
  blockType: ContentBlockType
  generatedContent: string
  editedContent: string | null
  isEdited: boolean
  generationParams: string | null
  parsedContent: unknown | null
  createdAt: string
}

export interface SaveContentBlockRequest {
  lessonSectionId: string | null
  blockType: string
  generatedContent: string
  generationParams: string | null
}

export async function getContentBlocks(lessonId: string): Promise<ContentBlockDto[]> {
  const res = await apiClient.get<ContentBlockDto[]>(`/api/lessons/${lessonId}/content-blocks`)
  return res.data
}

export async function saveContentBlock(lessonId: string, req: SaveContentBlockRequest): Promise<ContentBlockDto> {
  const res = await apiClient.post<ContentBlockDto>(`/api/lessons/${lessonId}/content-blocks`, req)
  return res.data
}

export async function updateEditedContent(lessonId: string, blockId: string, content: string): Promise<ContentBlockDto> {
  const res = await apiClient.put<ContentBlockDto>(
    `/api/lessons/${lessonId}/content-blocks/${blockId}/edited-content`,
    { editedContent: content }
  )
  return res.data
}

export async function deleteContentBlock(lessonId: string, blockId: string): Promise<void> {
  await apiClient.delete(`/api/lessons/${lessonId}/content-blocks/${blockId}`)
}

export async function resetEditedContent(lessonId: string, blockId: string): Promise<ContentBlockDto> {
  const res = await apiClient.delete<ContentBlockDto>(
    `/api/lessons/${lessonId}/content-blocks/${blockId}/edited-content`
  )
  return res.data
}
