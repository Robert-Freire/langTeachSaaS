export interface GenerateRequest {
  lessonId: string
  studentId?: string
  language: string
  cefrLevel: string
  topic: string
  style?: string
  existingNotes?: string
}

export type GenerateStatus = 'idle' | 'streaming' | 'done' | 'error'
