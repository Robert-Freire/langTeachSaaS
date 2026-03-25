import { describe, it, expect } from 'vitest'
import { getConstrainedSkills } from './competency-constraints'

describe('getConstrainedSkills', () => {
  it('detects speaking and listening for "written only"', () => {
    const skills = getConstrainedSkills('Written only. Formal register.')
    expect(skills).toContain('speaking')
    expect(skills).toContain('listening')
  })

  it('detects speaking and listening for "writing only"', () => {
    const skills = getConstrainedSkills('Writing only sessions.')
    expect(skills).toContain('speaking')
    expect(skills).toContain('listening')
  })

  it('detects speaking for "no role-play"', () => {
    const skills = getConstrainedSkills('Hates role-play. Needs formal register.')
    expect(skills).toContain('speaking')
  })

  it('detects speaking for "no speaking"', () => {
    const skills = getConstrainedSkills('No speaking activities please.')
    expect(skills).toContain('speaking')
  })

  it('detects listening for "no listening"', () => {
    const skills = getConstrainedSkills('No listening exercises.')
    expect(skills).toContain('listening')
  })

  it('detects writing for "no writing"', () => {
    const skills = getConstrainedSkills('No writing tasks.')
    expect(skills).toContain('writing')
  })

  it('detects reading for "no reading"', () => {
    const skills = getConstrainedSkills('No reading passages.')
    expect(skills).toContain('reading')
  })

  it('detects speaking, listening, and writing for "reading only"', () => {
    const skills = getConstrainedSkills('Reading only sessions.')
    expect(skills).toContain('speaking')
    expect(skills).toContain('listening')
    expect(skills).toContain('writing')
  })

  it('deduplicates skills across multiple patterns', () => {
    const skills = getConstrainedSkills('Written only. No speaking.')
    const speakingCount = skills.filter(s => s === 'speaking').length
    expect(speakingCount).toBe(1)
  })

  it('returns empty array for notes with no skill constraints', () => {
    const skills = getConstrainedSkills('Clara needs formal register. Relocating to Barcelona.')
    expect(skills).toHaveLength(0)
  })

  it('returns empty array for empty notes', () => {
    expect(getConstrainedSkills('')).toHaveLength(0)
  })
})
