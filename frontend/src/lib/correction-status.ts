import type { CorrectionStatus } from '../api/corrections'

export const STATUS_BADGE: Record<CorrectionStatus, string> = {
  Pendiente: 'bg-zinc-100 text-zinc-700',
  Entregada: 'bg-indigo-50 text-indigo-700',
  Encolada: 'bg-amber-50 text-amber-800',
  Corrigiendo: 'bg-amber-50 text-amber-800',
  Corregida: 'bg-emerald-50 text-emerald-800',
  CorreccionFallida: 'bg-red-50 text-red-700',
}

export const STATUS_LABEL: Record<CorrectionStatus, string> = {
  Pendiente: 'Pendiente',
  Entregada: 'Entregada',
  Encolada: 'En cola',
  Corrigiendo: 'Corrigiendo',
  Corregida: 'Corregida',
  CorreccionFallida: 'Error al corregir',
}

const BASE_LATENCY_BY_LEVEL: Record<string, number> = {
  A1: 30, A2: 45, B1: 60, B2: 90, C1: 120, C2: 150,
}
const TOKENS_PER_WORD = 1.5
const MS_PER_TOKEN = 10

export function estimateCorrectionMinutes(wordCount: number, cefrLevel: string): number {
  const base = BASE_LATENCY_BY_LEVEL[cefrLevel] ?? 60
  const seconds = base + (wordCount * TOKENS_PER_WORD * MS_PER_TOKEN) / 1000
  return Math.max(1, Math.ceil(seconds / 60))
}
