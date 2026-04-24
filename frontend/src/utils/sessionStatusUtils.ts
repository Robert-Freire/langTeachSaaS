export function getDisplayStatus(status: string, sessionDate: string): string {
  if (status === 'Cancelled') return 'Cancelled'
  if (status === 'Draft') return 'Draft'
  // Confirmed: derive display label from whether the session is in the past or future
  return new Date(sessionDate) < new Date() ? 'Completed' : 'Scheduled'
}

export function sessionStatusChipClass(displayStatus: string): string {
  if (displayStatus === 'Cancelled') return 'bg-red-50 text-red-600'
  if (displayStatus === 'Draft') return 'bg-amber-50 text-amber-700'
  if (displayStatus === 'Scheduled') return 'bg-indigo-50 text-indigo-600'
  return 'bg-zinc-100 text-zinc-500' // Completed
}
