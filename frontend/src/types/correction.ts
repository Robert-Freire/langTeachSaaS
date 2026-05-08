export type CorrectionTagCategory = 'C' | 'G' | 'L' | 'O' | 'MuyBien'

export type CorrectionStatus = 'Pendiente' | 'Entregada' | 'Corregida'

export interface CorrectionTagDto {
  category: CorrectionTagCategory
  spannedText: string
  startIndex: number
  endIndex: number
  explanation: string | null
  correctedForm: string | null
  orderIndex: number
}

export interface CorrectionDetailDto {
  id: string
  studentId: string
  schemaVersion: number
  status: CorrectionStatus
  assignmentTitle: string
  assignmentPrompt: string | null
  studentText: string | null
  markedUpOutput: string | null
  tags: CorrectionTagDto[]
  createdAt: string
  updatedAt: string
  correctedAt: string | null
}

export type CorrectionViewState = 'idle' | 'generating' | 'failed'
