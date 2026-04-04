export interface ParsedNotes {
  sections: { label: string; text: string }[]
}

export function parseNotes(raw: string | null): ParsedNotes | null {
  if (!raw || !raw.trim()) return null

  // Strip Excel import metadata prefix
  const text = raw.replace(/^\[Excel import \d{4}-\d{2}-\d{2}\]\s*/i, '').trim()
  if (!text) return null

  // Parse labeled subsections if Preply/Student info prefixes exist
  const hasPreply = /Preply test:/i.test(text)
  const hasStudentInfo = /Student info:/i.test(text)

  if (hasPreply || hasStudentInfo) {
    const sections: { label: string; text: string }[] = []

    const preplyMatch = text.match(/Preply test:\s*([\s\S]*?)(?=Student info:|$)/i)
    const studentInfoMatch = text.match(/Student info:\s*([\s\S]*?)(?=Preply test:|$)/i)

    // Include any text before the first prefix as a general section
    const firstPrefixIdx = Math.min(
      hasPreply ? text.search(/Preply test:/i) : Infinity,
      hasStudentInfo ? text.search(/Student info:/i) : Infinity,
    )
    const preamble = text.slice(0, firstPrefixIdx).trim()
    if (preamble) {
      sections.push({ label: 'Notes', text: preamble })
    }

    if (preplyMatch) {
      const body = preplyMatch[1].trim()
      if (body) sections.push({ label: 'Assessment notes', text: body })
    }
    if (studentInfoMatch) {
      const body = studentInfoMatch[1].trim()
      if (body) sections.push({ label: 'Background', text: body })
    }

    return sections.length > 0 ? { sections } : null
  }

  return { sections: [{ label: '', text }] }
}
