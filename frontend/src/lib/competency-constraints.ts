const SKILL_PATTERNS: Array<{ pattern: RegExp; skills: string[] }> = [
  { pattern: /no role.?play|hates role.?play|avoid role.?play/i, skills: ['speaking'] },
  { pattern: /written.?only|writing.?only/i, skills: ['speaking', 'listening'] },
  { pattern: /no speaking|no oral/i, skills: ['speaking'] },
  { pattern: /no listening/i, skills: ['listening'] },
  { pattern: /no writing/i, skills: ['writing'] },
  { pattern: /no reading/i, skills: ['reading'] },
  { pattern: /reading.?only/i, skills: ['speaking', 'listening', 'writing'] },
  { pattern: /oral.?only|speaking.?only/i, skills: ['reading', 'writing'] },
]

export function getConstrainedSkills(notes: string): string[] {
  const affected = new Set<string>()
  for (const { pattern, skills } of SKILL_PATTERNS) {
    if (pattern.test(notes)) {
      skills.forEach(s => affected.add(s))
    }
  }
  return Array.from(affected)
}
