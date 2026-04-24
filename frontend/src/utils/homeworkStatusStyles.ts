import { getHomeworkStatusInfo } from './homeworkStatusUtils'

export const HOMEWORK_STATUS_STYLES: Record<string, string> = {
  Done: 'bg-green-50 text-green-700 border-green-200',
  Partial: 'bg-amber-50 text-amber-700 border-amber-200',
  NotDone: 'bg-red-50 text-red-700 border-red-200',
  NotApplicable: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

export const HOMEWORK_STATUS_INFO: Record<string, { icon: string; color: string; label: string }> = {
  Done: getHomeworkStatusInfo('Done'),
  Partial: getHomeworkStatusInfo('Partial'),
  NotDone: getHomeworkStatusInfo('NotDone'),
  NotApplicable: getHomeworkStatusInfo('NotApplicable'),
}
