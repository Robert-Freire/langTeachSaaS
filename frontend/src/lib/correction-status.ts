import type { CorrectionStatus } from '../api/corrections'

export const STATUS_BADGE: Record<CorrectionStatus, string> = {
  Pendiente: 'bg-zinc-100 text-zinc-700',
  Entregada: 'bg-indigo-50 text-indigo-700',
  Corrigiendo: 'bg-amber-50 text-amber-800',
  Corregida: 'bg-emerald-50 text-emerald-800',
  CorreccionFallida: 'bg-red-50 text-red-700',
}

export const STATUS_LABEL: Record<CorrectionStatus, string> = {
  Pendiente: 'Pendiente',
  Entregada: 'Entregada',
  Corrigiendo: 'Corrigiendo',
  Corregida: 'Corregida',
  CorreccionFallida: 'Error al corregir',
}
