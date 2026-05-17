import { useCallback, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudent, updateStudent, patchStudentVoice } from '../api/students'
import { logger } from '../lib/logger'
import { newId } from '@/lib/newId'
import { getFollowups } from '@/api/followups'
import { listSessions } from '@/api/sessionLogs'
import type { SessionLog } from '@/api/sessionLogs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StudentDetailHeader } from '@/components/student/StudentDetailHeader'
import { StudentProfileTab } from '@/components/student/StudentProfileTab'
import { StudentOverviewTab } from '@/components/student/StudentOverviewTab'
import { SessionHistoryTab } from '@/components/session/SessionHistoryTab'
import { RedaccionesTab } from '@/components/student/RedaccionesTab'
import { ProgressDashboard } from '@/components/student/ProgressDashboard'
import { AudioRecorder } from '@/components/audio/AudioRecorder'
import { VoiceUpdateDrawer } from '@/components/student/VoiceUpdateDrawer'
import type { VoiceMergePatch } from '@/lib/voiceUpdateMerge'
import { extractStudentProfile } from '@/api/studentExtraction'
import { useVoiceExtractionFlow } from '@/hooks/useVoiceExtractionFlow'

function calcSessionFrequency(sessions: SessionLog[]): string | null {
  const past = sessions
    .filter(s => !s.isCancelled && s.sessionDate && s.statusName === 'Confirmed' && new Date(s.sessionDate) <= new Date())
    .sort((a, b) => new Date(a.sessionDate!).getTime() - new Date(b.sessionDate!).getTime())
  if (past.length === 0) return null
  if (past.length === 1) return '1 session'
  const first = new Date(past[0].sessionDate!)
  const last = new Date(past[past.length - 1].sessionDate!)
  const spanDays = Math.round((last.getTime() - first.getTime()) / 86400000)
  if (spanDays < 14) return `${past.length} sessions`
  const weeks = Math.max(1, Math.round(spanDays / 7))
  const avgDays = Math.round(spanDays / (past.length - 1))
  const weekLabel = weeks === 1 ? '1 week' : `${weeks} weeks`
  return `${past.length} sessions in ${weekLabel} · avg. every ${avgDays} days`
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'overview'
  const [difficultyToggleError, setDifficultyToggleError] = useState<string | null>(null)
  const difficultyToggleAttemptRef = useRef(0)

  const { voiceFlow, setVoiceFlow, extractedProfile, setExtractedProfile, cancelVoiceFlow: resetVoiceFlow } = useVoiceExtractionFlow()
  const [voiceError, setVoiceError] = useState<string | null>(null)

  function cancelVoiceFlow() {
    resetVoiceFlow()
    setVoiceError(null)
  }

  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: !!id,
  })

  const { data: followups = [], refetch: refetchFollowups } = useQuery({
    queryKey: ['followups', id],
    queryFn: () => getFollowups(id!),
    enabled: !!id,
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => listSessions(id!),
    enabled: !!id,
  })

  const nextSession = sessions
    .filter(s => s.sessionDate && new Date(s.sessionDate) > new Date() && !s.isCancelled && s.statusName === 'Confirmed')
    .sort((a, b) => new Date(a.sessionDate!).getTime() - new Date(b.sessionDate!).getTime())[0] ?? null

  const onFollowupChange = useCallback(() => { refetchFollowups() }, [refetchFollowups])
  const onStudentChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['student', id] })
  }, [queryClient, id])

  function buildStudentPayload() {
    if (!student) throw new Error('Student not loaded')
    return {
      name: student.name,
      learningLanguage: student.learningLanguage,
      cefrLevel: student.level.cefrLevel,
      interests: student.profile.interests,
      nativeLanguages: student.languages.nativeLanguages,
      learningGoals: student.profile.learningGoals,
      weaknesses: student.profile.weaknesses,
      difficulties: student.profile.difficulties,
      personalNotes: student.profile.personalNotes,
      teachingNotes: student.profile.teachingNotes,
      birthYear: student.identity.birthYear,
      profession: student.identity.profession,
      countryOfOrigin: student.identity.countryOfOrigin,
      cityOfOrigin: student.identity.cityOfOrigin,
      countryOfResidence: student.identity.countryOfResidence,
      cityOfResidence: student.identity.cityOfResidence,
      reasonForStudying: student.profile.reasonForStudying,
      officialCefrLevel: student.level.officialCefrLevel,
      shortTermObjectives: student.profile.shortTermObjectives,
      isActive: student.commercial.isActive,
      isCorporate: student.commercial.isCorporate,
      rate: student.commercial.rate,
      spokenLanguages: student.languages.spokenLanguages,
      skillLevelOverrides: student.level.skillLevelOverrides,
      teachingTodos: student.profile.teachingTodos,
    }
  }

  const { mutate: toggleDifficultyStatus } = useMutation({
    onMutate: () => {
      const attempt = ++difficultyToggleAttemptRef.current
      setDifficultyToggleError(null)
      return { attempt }
    },
    mutationFn: (vars: { difficultyId: string; status: 'Active' | 'Covered' }) => {
      const updated = student!.profile.difficulties.map((d) =>
        d.id === vars.difficultyId ? { ...d, status: vars.status } : d
      )
      return updateStudent(id!, { ...buildStudentPayload(), difficulties: updated })
    },
    onSuccess: (_data, _vars, context) => {
      if (context?.attempt === difficultyToggleAttemptRef.current) {
        setDifficultyToggleError(null)
      }
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err, _vars, context) => {
      logger.error('StudentDetail', 'Failed to update difficulty status', err)
      if (context?.attempt !== difficultyToggleAttemptRef.current) return
      setDifficultyToggleError('Could not update difficulty status. Please try again.')
    },
  })

  const { mutateAsync: saveReasonForStudying } = useMutation({
    mutationFn: (value: string) =>
      updateStudent(id!, { ...buildStudentPayload(), reasonForStudying: value || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to update reason for studying', err)
    },
  })

  const { mutateAsync: saveInterests } = useMutation({
    mutationFn: (value: string[]) =>
      updateStudent(id!, { ...buildStudentPayload(), interests: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to update interests', err)
    },
  })

  const { mutateAsync: saveTeachingNotes } = useMutation({
    mutationFn: (value: string) =>
      updateStudent(id!, { ...buildStudentPayload(), teachingNotes: value || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to update teaching notes', err)
    },
  })

  const { mutateAsync: saveLearningGoal } = useMutation({
    mutationFn: (text: string) => {
      const newGoal = { id: newId(), text, children: [] }
      return updateStudent(id!, { ...buildStudentPayload(), learningGoals: [...student!.profile.learningGoals, newGoal] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to add learning goal', err)
    },
  })

  const { mutateAsync: saveShortTermObjective } = useMutation({
    mutationFn: (text: string) => {
      const newObj = { id: newId(), text, targetDate: null, objectiveType: 'other' as const }
      return updateStudent(id!, { ...buildStudentPayload(), shortTermObjectives: [...student!.profile.shortTermObjectives, newObj] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to add objective', err)
    },
  })

  const { mutateAsync: saveDifficulty } = useMutation({
    mutationFn: ({ competency, description }: { competency: string; description: string }) => {
      const newDiff = { id: newId(), competency, description, subcategory: '', severity: 'medium', trend: 'stable', status: 'Active' }
      return updateStudent(id!, { ...buildStudentPayload(), difficulties: [...student!.profile.difficulties, newDiff] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to add difficulty', err)
    },
  })

  // Memoised so the AudioRecorder autoStart effect does not retrigger on every
  // parent render. See AudioRecorder.tsx for why callback identity matters here.
  const handleVoiceNote = useCallback(async (voiceNote: { transcription: string | null }) => {
    if (!voiceNote.transcription || !voiceNote.transcription.trim()) {
      setVoiceError('Transcription failed. Please try recording again.')
      setVoiceFlow('idle')
      return
    }
    setVoiceFlow('extracting')
    setVoiceError(null)
    try {
      const result = await extractStudentProfile(voiceNote.transcription)
      setExtractedProfile(result)
      setVoiceFlow('confirming')
    } catch (err) {
      logger.error('StudentDetail', 'Voice extraction failed', err)
      setVoiceError('Extraction failed. Please try again.')
      setVoiceFlow('idle')
    }
  }, [setExtractedProfile, setVoiceFlow])

  async function handleVoiceSave(patch: VoiceMergePatch) {
    if (!student) return
    setVoiceFlow('saving')
    try {
      await patchStudentVoice(id!, patch)
      queryClient.invalidateQueries({ queryKey: ['student', id] })
      setVoiceFlow('idle')
      setExtractedProfile(null)
    } catch (err) {
      logger.error('StudentDetail', 'Voice save failed', err)
      setVoiceError('Save failed. Please try again.')
      setVoiceFlow('confirming')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-6 w-12 rounded-md" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="font-manrope text-[1.75rem] font-bold text-[#1A1B22]">Student not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          Go back
        </Button>
      </div>
    )
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'profile', label: 'Profile' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'redacciones', label: 'Redacciones' },
    { key: 'progress', label: 'Progress' },
  ]

  const sessionFrequency = calcSessionFrequency(sessions)

  return (
    <div className="space-y-6">
      <StudentDetailHeader
        student={student}
        nextSession={nextSession}
        sessionFrequency={sessionFrequency}
        onVoiceUpdateClick={() => setVoiceFlow('recording')}
        voiceFlowActive={voiceFlow !== 'idle'}
      />

      {voiceFlow === 'recording' && (
        <div className="rounded-2xl bg-white p-4 flex flex-col gap-2" data-testid="voice-recorder-panel">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Update via voice</p>
          <AudioRecorder
            autoStart
            showUploadFallbackLink
            onVoiceNote={handleVoiceNote}
          />
          {voiceError && <p className="text-sm text-red-500">{voiceError}</p>}
          <Button variant="ghost" size="sm" className="self-start" onClick={cancelVoiceFlow}>
            Cancel
          </Button>
        </div>
      )}

      {voiceFlow === 'extracting' && (
        <div className="rounded-2xl bg-white p-4 flex items-center gap-2 text-sm text-gray-500" data-testid="extracting-indicator">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          Analysing recording...
        </div>
      )}

      {(voiceFlow === 'confirming' || voiceFlow === 'saving') && extractedProfile && (
        <VoiceUpdateDrawer
          student={student}
          extracted={extractedProfile}
          saving={voiceFlow === 'saving'}
          saveError={voiceError}
          onSave={(patch: VoiceMergePatch) => handleVoiceSave(patch)}
          onClose={cancelVoiceFlow}
        />
      )}

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setSearchParams({ tab: tab.key })}
            className={`shrink-0 px-3 py-2 sm:px-5 sm:py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'text-indigo-700 bg-white'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-[#F4F2FD]'
            }`}
            style={activeTab === tab.key ? { boxShadow: '0 1px 3px rgba(26, 27, 34, 0.08)' } : undefined}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <StudentOverviewTab
          student={student}
          sessions={sessions}
          followups={followups}
          onFollowupChange={onFollowupChange}
          onStudentChange={onStudentChange}
          onViewAllSessions={() => setSearchParams({ tab: 'sessions' })}
          onSaveTeachingNotes={(v) => saveTeachingNotes(v).then(() => {})}
        />
      )}

      {activeTab === 'profile' && (
        <StudentProfileTab
          student={student}
          followups={followups}
          onFollowupChange={onFollowupChange}
          onStudentChange={onStudentChange}
          difficultyToggleError={difficultyToggleError}
          onToggleDifficultyStatus={(difficultyId, status) =>
            toggleDifficultyStatus({ difficultyId, status })
          }
          onSaveReasonForStudying={(v) => saveReasonForStudying(v).then(() => {})}
          onSaveInterests={(v) => saveInterests(v).then(() => {})}
          onSaveLearningGoal={(text) => saveLearningGoal(text).then(() => {})}
          onSaveShortTermObjective={(text) => saveShortTermObjective(text).then(() => {})}
          onSaveDifficulty={(vars) => saveDifficulty(vars).then(() => {})}
        />
      )}

      {activeTab === 'sessions' && (
        <SessionHistoryTab studentId={student.id} />
      )}

      {activeTab === 'redacciones' && (
        <RedaccionesTab studentId={student.id} />
      )}

      {activeTab === 'progress' && (
        <ProgressDashboard student={student} sessions={sessions} />
      )}

    </div>
  )
}
