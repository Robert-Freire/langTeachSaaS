import { useState } from 'react'
import { CalendarClock, ArrowRight, Brain } from 'lucide-react'
import type { Student } from '@/api/students'
import type { TeacherFollowup } from '@/api/followups'
import type { SessionLog } from '@/api/sessionLogs'
import { parseTopicTags } from '@/api/sessionLogs'
import { TeachingTodosCard } from './TeachingTodosCard'
import { StudentFollowupsCard } from './StudentFollowupsCard'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { getObjectiveUrgency, getDaysRemaining, formatDaysRemaining } from '@/lib/objectiveUrgency'
import { SectionHeader } from './SectionHeader'
import { formatMonthYear, formatDateLong, formatDateShort } from '@/utils/formatDate'

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
// PrimaryObjectiveCard
// ---------------------------------------------------------------------------

function PrimaryObjectiveCard({ student }: { student: Student }) {
  const objectives = student.shortTermObjectives
  if (objectives.length === 0) {
    return (
      <div
        className="bg-white rounded-2xl px-6 py-4"
        style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
        data-testid="primary-objective-card"
      >
        <SectionHeader>Primary Objective</SectionHeader>
        <p className="text-sm text-zinc-400 italic">No objectives set</p>
      </div>
    )
  }

  const sorted = [...objectives].sort((a, b) => {
    const order = { overdue: 0, critical: 1, normal: 2 }
    const urgencyDelta =
      order[getObjectiveUrgency(a.targetDate)] - order[getObjectiveUrgency(b.targetDate)]
    if (urgencyDelta !== 0) return urgencyDelta
    const aDays = getDaysRemaining(a.targetDate)
    const bDays = getDaysRemaining(b.targetDate)
    return (aDays ?? Number.POSITIVE_INFINITY) - (bDays ?? Number.POSITIVE_INFINITY)
  })

  const obj = sorted[0]
  const urgency = getObjectiveUrgency(obj.targetDate)
  const daysRemaining = getDaysRemaining(obj.targetDate)

  return (
    <div
      className="bg-white rounded-2xl p-6"
      style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
      data-testid="primary-objective-card"
    >
      <SectionHeader>Primary Objective</SectionHeader>
      <div
        className={`rounded-xl p-4 ${
          urgency === 'overdue'
            ? 'border-2 border-red-300 bg-red-50'
            : urgency === 'critical'
              ? 'border-2 border-orange-300 bg-orange-50'
              : 'border border-zinc-200 bg-zinc-50'
        }`}
        data-testid="objective-item"
      >
        <p className="text-sm font-medium text-[#1A1B22] leading-snug" data-testid="objective-text">
          {obj.text}
        </p>
        {obj.targetDate && (
          <div className="flex items-center gap-2 mt-2">
            <CalendarClock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-500">
              {new Date(obj.targetDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            {daysRemaining !== null && (
              <span
                className={`text-xs font-semibold ${
                  urgency === 'overdue'
                    ? 'text-red-600'
                    : urgency === 'critical'
                      ? 'text-orange-600'
                      : 'text-zinc-500'
                }`}
                data-testid="days-remaining"
              >
                {formatDaysRemaining(daysRemaining)}
              </span>
            )}
          </div>
        )}
      </div>

      {objectives.length > 1 && (
        <p className="text-xs text-zinc-400 mt-2">
          +{objectives.length - 1} more {objectives.length - 1 === 1 ? 'objective' : 'objectives'}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PedagogicalProfileCard
// ---------------------------------------------------------------------------

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function cefrBarWidth(level: string): number {
  const idx = CEFR_ORDER.indexOf(level.toUpperCase())
  if (idx === -1) return 0
  return Math.round(((idx + 1) / CEFR_ORDER.length) * 100)
}

function cefrBarColor(level: string): string {
  const prefix = level[0]?.toUpperCase()
  if (prefix === 'C') return 'bg-[#7E3000]'
  if (prefix === 'B') return 'bg-indigo-600'
  return 'bg-indigo-300'
}

function PedagogicalProfileCard({ student }: { student: Student }) {
  const overrides = student.skillLevelOverrides
  const entries = Object.entries(overrides)

  return (
    <div
      className="bg-[#F4F2FD] rounded-2xl p-6 flex flex-col justify-between"
      data-testid="pedagogical-profile-card"
    >
      <div>
        <SectionHeader>Pedagogical Profile</SectionHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-400 italic" data-testid="pedagogical-profile-empty">
            No skill overrides set
          </p>
        ) : (
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
        )}
      </div>

      {student.nativeLanguages.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/50 flex flex-wrap gap-2" data-testid="native-language-tags">
          {student.nativeLanguages.map((lang) => (
            <span
              key={lang}
              className="bg-[#E2DFFF] text-[#3323CC] rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            >
              {lang}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RecentSessions
// ---------------------------------------------------------------------------

function getSessionTitle(session: SessionLog): string {
  if (session.title) return session.title
  if (session.plannedContent) return session.plannedContent.slice(0, 60)
  return 'Session'
}

function getSessionNarrative(session: SessionLog): string | null {
  const text = session.actualContent || session.generalNotes
  if (!text) return null
  return text.length > 120 ? text.slice(0, 120) + '...' : text
}

function RecentSessions({
  sessions,
  onViewAll,
}: {
  sessions: SessionLog[]
  onViewAll?: () => void
}) {
  const recent = [...sessions]
    .filter(s => s.sessionDate && !s.isCancelled)
    .sort((a, b) => new Date(b.sessionDate!).getTime() - new Date(a.sessionDate!).getTime())
    .slice(0, 3)

  return (
    <div data-testid="recent-sessions">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-manrope text-base font-bold text-[#1A1B22]">Session History</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            data-testid="view-all-sessions-btn"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-zinc-400 italic" data-testid="recent-sessions-empty">
          No sessions logged yet.
        </p>
      ) : (
        <div className="space-y-4">
          {recent.map((session, idx) => {
            const narrative = getSessionNarrative(session)
            const tags = parseTopicTags(session.topicTags).slice(0, 3)

            return (
              <div
                key={session.id}
                className="bg-white rounded-2xl p-5"
                style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
                data-testid="recent-session-item"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span
                      className={`text-xs font-bold uppercase tracking-widest block mb-0.5 ${
                        idx === 0 ? 'text-indigo-600' : 'text-zinc-400'
                      }`}
                    >
                      {formatDateLong(session.sessionDate!)}
                    </span>
                    <h4 className="text-sm font-bold text-[#1A1B22]">
                      {getSessionTitle(session)}
                    </h4>
                  </div>
                  {session.duration && (
                    <span className="shrink-0 text-xs text-zinc-500 bg-[#F4F2FD] rounded px-2 py-0.5">
                      {session.duration}min
                    </span>
                  )}
                </div>

                {narrative && (
                  <p className="text-xs text-zinc-600 leading-relaxed mb-3">{narrative}</p>
                )}

                {session.homeworkAssigned && (
                  <p className="text-xs font-semibold text-[#7E3000] mb-2">
                    Homework: {session.homeworkAssigned}
                  </p>
                )}

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag.tag}
                        className="text-[10px] font-bold uppercase tracking-wide bg-[#D3E4FE] text-[#38485D] rounded-full px-2.5 py-0.5"
                      >
                        {tag.tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
  const [draft, setDraft] = useState(student.teachingNotes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!onSaveTeachingNotes) return
    setSaving(true)
    try {
      await onSaveTeachingNotes(draft)
      onStudentChange()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleEdit() {
    setDraft(student.teachingNotes ?? '')
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
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-bold transition-all disabled:opacity-50"
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
              {student.teachingNotes ? (
                <p
                  className="text-sm text-zinc-400 leading-relaxed mb-5"
                  data-testid="teaching-notes-text"
                >
                  {student.teachingNotes}
                </p>
              ) : (
                <p className="text-sm text-zinc-600 italic mb-5" data-testid="teaching-notes-empty">
                  No notes yet.
                </p>
              )}
              <button
                onClick={handleEdit}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-sm font-bold transition-all"
                data-testid="add-memory-btn"
              >
                Add Memory
              </button>
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
  return (
    <div className="space-y-6" data-testid="student-overview-tab">
      {/* Primary Objective - full width */}
      <PrimaryObjectiveCard student={student} />

      {/* Three-card row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Teaching Todos */}
        <div
          className="bg-white rounded-2xl p-6"
          style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
        >
          <SectionHeader>Ideas para clases</SectionHeader>
          <TeachingTodosCard
            todos={student.teachingTodos}
            studentId={student.id}
            onStudentChange={onStudentChange}
          />
        </div>

        {/* Card 2: Pending Followups */}
        <div
          className="bg-[#FFF9F2] rounded-2xl p-6 border-l-4 border-[#FFDBCC]"
          style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
        >
          <StudentFollowupsCard
            followups={followups}
            studentId={student.id}
            onFollowupChange={onFollowupChange ?? (() => {})}
          />
        </div>

        {/* Card 3: Pedagogical Profile */}
        <PedagogicalProfileCard student={student} />
      </div>

      {/* Recent Sessions */}
      <RecentSessions sessions={sessions} onViewAll={onViewAllSessions} />

      {/* Teacher's Working Memory */}
      <TeachingNotesPanel
        student={student}
        onStudentChange={onStudentChange}
        onSaveTeachingNotes={onSaveTeachingNotes}
      />
    </div>
  )
}
