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

export function getContentBlocks(lessonId: string): Promise<ContentBlockDto[]> {
  return apiClient.get<ContentBlockDto[]>(`/api/lessons/${lessonId}/content-blocks`).then(r => r.data)
}

export function saveContentBlock(lessonId: string, req: SaveContentBlockRequest): Promise<ContentBlockDto> {
  return apiClient.post<ContentBlockDto>(`/api/lessons/${lessonId}/content-blocks`, req).then(r => r.data)
}

export function updateEditedContent(lessonId: string, blockId: string, content: string): Promise<ContentBlockDto> {
  return apiClient
    .put<ContentBlockDto>(`/api/lessons/${lessonId}/content-blocks/${blockId}/edited-content`, { editedContent: content })
    .then(r => r.data)
}

export function deleteContentBlock(lessonId: string, blockId: string): Promise<void> {
  return apiClient.delete(`/api/lessons/${lessonId}/content-blocks/${blockId}`).then(() => undefined)
}

export function resetEditedContent(lessonId: string, blockId: string): Promise<ContentBlockDto> {
  return apiClient
    .delete<ContentBlockDto>(`/api/lessons/${lessonId}/content-blocks/${blockId}/edited-content`)
    .then(r => r.data)
}
