export type HomeworkStatus = 'NotApplicable' | 'NotDone' | 'Partial' | 'Done'

const KNOWN_STATUSES = new Set<string>(['NotApplicable', 'NotDone', 'Partial', 'Done'])

export interface HomeworkStatusInfo {
  label: string
  icon: string
  color: string
}

function assertNever(x: never): never {
  throw new Error(`Unhandled HomeworkStatus: ${String(x)}`)
}

export function getHomeworkStatusInfo(status: HomeworkStatus): HomeworkStatusInfo {
  switch (status) {
    case 'NotApplicable': return { label: 'Not applicable', icon: '—', color: 'text-zinc-400' }
    case 'NotDone': return { label: 'Not done', icon: '✗', color: 'text-red-500' }
    case 'Partial': return { label: 'Partial', icon: '◑', color: 'text-amber-500' }
    case 'Done': return { label: 'Done', icon: '✓', color: 'text-emerald-600' }
    default: return assertNever(status)
  }
}

export function getHomeworkStatusInfoSafe(status: string | null | undefined): HomeworkStatusInfo {
  if (status && KNOWN_STATUSES.has(status)) {
    return getHomeworkStatusInfo(status as HomeworkStatus)
  }
  return status ? { label: status, icon: '?', color: 'text-zinc-500' } : getHomeworkStatusInfo('NotApplicable')
}

export function isHomeworkApplicable(status: string | null | undefined): boolean {
  return !!status && status !== 'NotApplicable'
}

export const HOMEWORK_STATUS_PILL_OPTIONS: Array<{ value: HomeworkStatus; label: string }> = [
  { value: 'Done', label: 'Done' },
  { value: 'Partial', label: 'Partial' },
  { value: 'NotDone', label: 'Not done' },
]
