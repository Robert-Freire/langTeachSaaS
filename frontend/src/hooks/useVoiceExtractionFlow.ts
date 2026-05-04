import { useState } from 'react'
import type { ExtractedStudentProfile } from '@/api/studentExtraction'

export type VoiceFlow = 'idle' | 'recording' | 'extracting' | 'confirming' | 'saving'

export function useVoiceExtractionFlow() {
  const [voiceFlow, setVoiceFlow] = useState<VoiceFlow>('idle')
  const [extractedProfile, setExtractedProfile] = useState<ExtractedStudentProfile | null>(null)

  function cancelVoiceFlow() {
    setExtractedProfile(null)
    setVoiceFlow('idle')
  }

  return { voiceFlow, setVoiceFlow, extractedProfile, setExtractedProfile, cancelVoiceFlow }
}
