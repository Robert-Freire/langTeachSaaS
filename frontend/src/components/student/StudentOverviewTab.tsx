import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Brain, Plus, BookOpen } from 'lucide-react'
import type { Student } from '@/api/students'
import type { TeacherFollowup } from '@/api/followups'
import type { SessionLog } from '@/api/sessionLogs'
import { TeachingTodosCard } from './TeachingTodosCard'
import { StudentFollowupsCard } from './StudentFollowupsCard'
import { LastSessionCard } from './LastSessionCard'
import { pickLastSession } from '@/lib/sessionUtils'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { SectionHeader } from './SectionHeader'
import { formatMonthYear } from '@/utils/formatDate'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { CEFR_ORDER } from '@/utils/cefrUtils'
import { getDisplayTitle } from '@/lib/sessionUtils'
import { rotatingPrompt } from '@/utils/rotatingPrompt'

interface Props {
  student: Student
  sessions?: SessionLog[]
  followups?: TeacherFollowup[]
  onFollowupChange?: () => void
  onStudentChange: () => void
  onViewAllSessions?: () => void
  onSaveTeachingNotes?: (notes: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PedagogicalProfileCard
// ---------------------------------------------------------------------------

function cefrBarWidth(level: string): number {
  const num = CEFR_ORDER[level.toUpperCase()] ?? 0
  return Math.round((num / 6) * 100)
}

function cefrBarColor(level: string): string {
  const prefix = level[0]?.toUpperCase()
  if (prefix === 'C') return 'bg-[#7E3000]'
  if (prefix === 'B') return 'bg-primary'
  return 'bg-indigo-300'
}

function PedagogicalProfileCard({ student }: { student: Student }) {
  const overrides = student.level.skillLevelOverrides
  const entries = Object.entries(overrides)
  const activeDifficulties = student.profile.difficulties.filter(d => d.status === 'Active')
  const firstName = student.name.split(' ')[0]

  const PROFILE_PROMPTS = [
    `What does ${firstName} struggle with most?`,
    `Which skill needs most work: speaking, writing, reading, or listening?`,
    `Any grammar points ${firstName} keeps getting wrong?`,
    `${firstName}'s weakest area right now?`,
  ]

  return (
    <div
      className="bg-[#F4F2FD] rounded-2xl p-6 flex flex-col justify-between"
      data-testid="pedagogical-profile-card"
    >
      <div>
        <SectionHeader>Pedagogical Profile</SectionHeader>

        {entries.length === 0 ? (
          <div data-testid="pedagogical-profile-empty">
            {activeDifficulties.length > 0 ? (
              <ul className="space-y-1.5 mb-2">
                {activeDifficulties.slice(0, 2).map(d => (
                  <li key={d.id} className="text-xs text-[#1A1B22] flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    {d.description}
                  </li>
                ))}
              </ul>
            ) : student.profile.learningGoals.length > 0 ? (
              <ul className="space-y-1.5 mb-2">
                {student.profile.learningGoals.slice(0, 2).map(g => (
                  <li key={g.id} className="text-xs text-[#1A1B22] flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    {g.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-400 italic mb-2" data-testid="pedagogical-profile-rotating-prompt">
                {rotatingPrompt(student.id, PROFILE_PROMPTS)}
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="space-y-4" data-testid="skill-bars">
              {entries.map(([skill, level]) => (
                <div key={skill}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      {skill}
                    </span>
                    <CefrBadge level={level} data-testid={`overview-skill-badge-${skill.toLowerCase()}`} />
                  </div>
                  <div className="w-full bg-white h-2 rounded-full">
                    <div
                      className={`${cefrBarColor(level)} h-full rounded-full transition-all`}
                      style={{ width: `${cefrBarWidth(level)}%` }}
                      data-testid={`skill-bar-${skill}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {activeDifficulties.length > 0 && (
              <p className="text-xs text-zinc-500 mt-3" data-testid="profile-difficulties-summary">
                Working on:{' '}
                {activeDifficulties
                  .slice(0, 2)
                  .map(d => d.description)
                  .join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Language tags — always rendered; target language always present */}
      <div className="mt-5 pt-4 border-t border-white/50 flex flex-wrap items-center gap-2" data-testid="language-tags">
        {student.languages.nativeLanguages.map((lang) => (
          <span
            key={`L-${lang}`}
            className="inline-block bg-[#E2DFFF] text-[#3323CC] rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            data-testid="native-language-tag"
          >
            L-{lang.toUpperCase()}
          </span>
        ))}
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex items-center" />}>
            <span
              className="inline-block bg-[#D0F4DE] text-[#1A6636] rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide cursor-default"
              data-testid="target-language-tag"
            >
              T-{student.learningLanguage.toUpperCase()}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Target language: this student is being taught in {student.learningLanguage}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RecentSessions — compact variant
// ---------------------------------------------------------------------------

function CalendarBlock({ dateStr, isMostRecent }: { dateStr: string; isMostRecent: boolean }) {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  return (
    <div
      className={`shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center ${
        isMostRecent ? 'bg-indigo-100' : 'bg-zinc-100'
      }`}
      aria-label={dateStr}
    >
      <span className={`text-base font-bold leading-none ${isMostRecent ? 'text-indigo-700' : 'text-zinc-600'}`}>
        {day}
      </span>
      <span className={`text-[9px] font-bold tracking-wide leading-none mt-0.5 ${isMostRecent ? 'text-indigo-500' : 'text-zinc-400'}`}>
        {month}
      </span>
    </div>
  )
}

function CompactSessionCard({ session, isMostRecent, studentId }: { session: SessionLog; isMostRecent: boolean; studentId: string }) {
  const title = getDisplayTitle(session)
  const hw = session.homeworkAssigned

  return (
    <Link
      to={`/students/${studentId}/sessions/${session.id}/edit`}
      className="bg-white rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-[#F4F2FD] transition-colors"
      style={{ boxShadow: '0 4px 16px rgba(26, 27, 34, 0.05)', minHeight: '72px' }}
      data-testid="recent-session-item"
    >
      {session.sessionDate && (
        <CalendarBlock dateStr={session.sessionDate} isMostRecent={isMostRecent} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 justify-between">
          <p className="text-sm font-bold text-[#1A1B22] line-clamp-2 leading-snug" data-testid="compact-session-title">
            {title}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {session.duration && (
              <span className="text-xs text-zinc-500 bg-[#F4F2FD] rounded px-2 py-0.5 whitespace-nowrap">
                {session.duration}min
              </span>
            )}
          </div>
        </div>

        {hw && (
          <div className="flex items-center gap-1 mt-1.5">
            <BookOpen className="h-3 w-3 text-[#7E3000] shrink-0" />
            <span
              className="text-[10px] font-semibold text-[#7E3000] bg-amber-50 rounded-full px-2 py-0.5 line-clamp-1"
              data-testid="compact-session-homework"
            >
              {hw}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

function RecentSessions({
  sessions,
  onViewAll,
  skipFirst = false,
  studentId,
}: {
  sessions: SessionLog[]
  onViewAll?: () => void
  skipFirst?: boolean
  studentId: string
}) {
  const sorted = [...sessions]
    .filter(s => s.sessionDate && !s.isCancelled)
    .sort((a, b) => new Date(b.sessionDate!).getTime() - new Date(a.sessionDate!).getTime())
  const start = skipFirst ? 1 : 0
  const recent = sorted.slice(start, start + 2)

  if (skipFirst && recent.length === 0) return null

  return (
    <div data-testid="recent-sessions">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-manrope text-base font-bold text-[#1A1B22]">Session History</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            data-testid="view-all-sessions-btn"
          >
            View all sessions <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-zinc-400 italic" data-testid="recent-sessions-empty">
          No sessions logged yet.
        </p>
      ) : (
        <div className="space-y-2">
          {recent.map((session, idx) => (
            <CompactSessionCard key={session.id} session={session} isMostRecent={idx === 0} studentId={studentId} />
          ))}
        </div>
      )}

      {recent.length > 0 && onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-2 w-full text-center text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors py-1"
          data-testid="view-all-sessions-inline"
        >
          View all sessions <ArrowRight className="inline h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TeachingNotesPanel
// ---------------------------------------------------------------------------

function TeachingNotesPanel({
  student,
  onStudentChange,
  onSaveTeachingNotes,
}: {
  student: Student
  onStudentChange: () => void
  onSaveTeachingNotes?: (notes: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(student.profile.teachingNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    if (!onSaveTeachingNotes || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSaveTeachingNotes(draft)
      onStudentChange()
      setEditing(false)
    } catch {
      setSaveError('Failed to save notes.')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit() {
    setDraft(student.profile.teachingNotes ?? '')
    setEditing(true)
  }

  return (
    <section
      className="rounded-3xl p-8 text-white relative overflow-hidden"
      style={{ background: '#1A1B22' }}
      data-testid="teaching-notes-panel"
    >
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-9">
          <h3 className="text-base font-bold font-manrope mb-4 flex items-center gap-2 text-[#C3C0FF]">
            <Brain className="h-4 w-4" />
            Teacher&apos;s Working Memory
          </h3>

          {editing ? (
            <div className="space-y-3">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={5}
                className="w-full rounded-xl bg-white/10 border border-white/20 text-white text-sm p-3 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-white/40"
                placeholder="Notes about how this student learns best..."
                data-testid="teaching-notes-textarea"
              />
              {saveError && <p className="text-sm text-red-300">{saveError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl lt-gradient-primary bg-primary text-white hover:shadow-md active:brightness-90 disabled:[background-image:none] disabled:opacity-50 px-4 py-1.5 text-sm font-bold transition-all"
                  data-testid="teaching-notes-save-btn"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-1.5 text-sm font-medium transition-all"
                  data-testid="teaching-notes-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {student.profile.teachingNotes ? (
                <p
                  className="text-sm text-zinc-400 leading-relaxed mb-5"
                  data-testid="teaching-notes-text"
                >
                  {student.profile.teachingNotes}
                </p>
              ) : (
                <p className="text-sm text-zinc-600 italic mb-5" data-testid="teaching-notes-empty">
                  No notes yet.
                </p>
              )}
              {onSaveTeachingNotes && (
                <button
                  onClick={handleEdit}
                  className="rounded-xl lt-gradient-primary bg-primary text-white hover:shadow-md active:brightness-90 disabled:[background-image:none] disabled:opacity-50 px-5 py-2 text-sm font-bold transition-all"
                  data-testid="add-memory-btn"
                >
                  Add Memory
                </button>
              )}
            </>
          )}
        </div>

        <div className="md:col-span-3">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 h-full flex flex-col justify-center">
            <h4 className="text-[0.6875rem] font-bold uppercase tracking-widest text-zinc-400 mb-3">
              Lifecycle
            </h4>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Student Since</span>
              <span className="font-bold text-white" data-testid="student-since">
                {formatMonthYear(student.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative blur */}
      <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(77,68,227,0.2)', filter: 'blur(100px)' }} />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function StudentOverviewTab({
  student,
  sessions = [],
  followups = [],
  onFollowupChange,
  onStudentChange,
  onViewAllSessions,
  onSaveTeachingNotes,
}: Props) {
  const [showIdeasAdd, setShowIdeasAdd] = useState(false)

  const pendingFollowupsCount = followups.filter(f => f.status === 'pending').length
  const pendingTodosCount = student.profile.teachingTodos.filter(t => t.status === 'pending').length
  const firstName = student.name.split(' ')[0]
  const lastSession = pickLastSession(sessions)

  const FOLLOWUP_PROMPTS = [
    `Anything you promised ${firstName} for next class?`,
    `Any materials to prepare before the next session?`,
  ]
  const IDEAS_PROMPTS = [
    `Any topic ${firstName} would enjoy practising?`,
    `What activity worked well last time?`,
    `A grammar point you've been meaning to cover?`,
  ]

  const followupEmptyPrompt = rotatingPrompt(student.id, FOLLOWUP_PROMPTS)

  return (
    <div className="space-y-5" data-testid="student-overview-tab">
      {/* Three-card row: Followups | Profile | Ideas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" data-testid="three-card-row">
        {/* Card 1: Pending Followups */}
        <div
          className={`rounded-2xl p-6 transition-colors ${
            pendingFollowupsCount > 0 ? 'bg-[#FFF9F2]' : 'bg-white'
          }`}
          style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
          data-testid="followups-card-wrapper"
        >
          <StudentFollowupsCard
            followups={followups}
            studentId={student.id}
            onFollowupChange={onFollowupChange ?? (() => {})}
            emptyPrompt={followupEmptyPrompt}
          />
        </div>

        {/* Card 2: Pedagogical Profile */}
        <PedagogicalProfileCard student={student} />

        {/* Card 3: Teaching Ideas */}
        <div
          className={`rounded-2xl p-6 transition-colors ${
            pendingTodosCount > 0 ? 'bg-white' : 'bg-[#F4F2FD]'
          }`}
          style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
          data-testid="ideas-card-wrapper"
        >
          <div className="flex items-center justify-between mb-1">
            <SectionHeader>Teaching Ideas</SectionHeader>
            <button
              type="button"
              onClick={() => setShowIdeasAdd(true)}
              aria-label="Add teaching idea"
              data-testid="ideas-add-header-btn"
              className="rounded-lg bg-indigo-50 hover:bg-indigo-100 p-1 text-indigo-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {student.profile.teachingTodos.length === 0 && !showIdeasAdd && (
            <p className="text-xs text-zinc-400 italic mb-3" data-testid="ideas-rotating-prompt">
              {rotatingPrompt(student.id, IDEAS_PROMPTS)}
            </p>
          )}

          <TeachingTodosCard
            todos={student.profile.teachingTodos}
            studentId={student.id}
            onStudentChange={onStudentChange}
            showAddForm={showIdeasAdd}
            onAddFormClose={() => setShowIdeasAdd(false)}
          />
        </div>
      </div>

      {/* Last session summary (richer than the compact history strip) */}
      <LastSessionCard session={lastSession} studentId={student.id} />

      {/* Compact Session History -- skip the top entry when LastSessionCard is showing it */}
      {lastSession !== null && (
        <RecentSessions sessions={sessions} onViewAll={onViewAllSessions} skipFirst studentId={student.id} />
      )}

      {/* Teacher's Working Memory */}
      <TeachingNotesPanel
        student={student}
        onStudentChange={onStudentChange}
        onSaveTeachingNotes={onSaveTeachingNotes}
      />
    </div>
  )
}
