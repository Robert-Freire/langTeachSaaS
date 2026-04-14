function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h
}

/**
 * Returns a prompt string that is stable for a given student and day.
 * Rotation formula: abs(hash(studentId + dateISO)) % prompts.length
 */
export function rotatingPrompt(studentId: string, prompts: string[]): string {
  const today = new Date().toISOString().slice(0, 10)
  return prompts[Math.abs(hashCode(studentId + today)) % prompts.length]
}
