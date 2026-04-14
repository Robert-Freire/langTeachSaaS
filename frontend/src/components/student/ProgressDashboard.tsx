import { useMemo } from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import type { Student } from '@/api/students'
import type { SessionLog } from '@/api/sessionLogs'

interface Props {
  student: Student
  sessions: SessionLog[]
}

const CEFR_ORDER: Record<string, number> = {
  A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6,
}

const SKILL_ORDER = ['Reading', 'Writing', 'Speaking', 'Listening']

function cefrBarWidth(level: string): number {
  return ((CEFR_ORDER[level] ?? 0) / 6) * 100
}

function isAboveOrAtBaseline(skillLevel: string, baselineLevel: string): boolean {
  return (CEFR_ORDER[skillLevel] ?? 0) >= (CEFR_ORDER[baselineLevel] ?? 0)
}

function isGapTwoOrMore(skillLevel: string, baselineLevel: string): boolean {
  return (CEFR_ORDER[baselineLevel] ?? 0) - (CEFR_ORDER[skillLevel] ?? 0) >= 2
}

function formatStartDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function formatTimeSince(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

interface PacingStats {
  completedSessions: SessionLog[]
  cancelledSessions: SessionLog[]
  firstDate: string | null
  frequency: string | null
  cancellationRate: number
  isBehind: boolean
}

function computePacingStats(sessions: SessionLog[], fallbackStartDate: string | null): PacingStats {
  const now = Date.now()
  const completed = sessions.filter(
    (s) => !s.isCancelled && s.statusName === 'Confirmed' && s.sessionDate,
  )
  const cancelled = sessions.filter((s) => s.isCancelled)
  const allDated = sessions.filter((s) => s.sessionDate)
  const firstDate =
    allDated.length > 0
      ? allDated.reduce((min, s) =>
          new Date(s.sessionDate!) < new Date(min.sessionDate!) ? s : min,
        ).sessionDate!
      : fallbackStartDate
  const weeksSinceStart = firstDate
    ? (now - new Date(firstDate).getTime()) / (7 * 24 * 60 * 60 * 1000)
    : null
  const frequency =
    weeksSinceStart && weeksSinceStart > 0
      ? (completed.length / weeksSinceStart).toFixed(1)
      : null
  const total = completed.length + cancelled.length
  const cancellationRate = total > 0 ? Math.round((cancelled.length / total) * 100) : 0
  const isBehind =
    weeksSinceStart !== null &&
    weeksSinceStart >= 4 &&
    completed.length < weeksSinceStart
  return { completedSessions: completed, cancelledSessions: cancelled, firstDate, frequency, cancellationRate, isBehind }
}

function computeRecentMentions(sessions: SessionLog[]): Set<string> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const mentions = new Set<string>()
  sessions
    .filter(
      (s) =>
        !s.isCancelled &&
        s.statusName === 'Confirmed' &&
        s.sessionDate &&
        new Date(s.sessionDate) >= thirtyDaysAgo,
    )
    .forEach((s) => {
      try {
        const pairs = JSON.parse(s.mentionedDifficultyPairs || '[]') as {
          Competency: string
          Subcategory: string
        }[]
        pairs.forEach((p) => mentions.add(`${p.Competency}|${p.Subcategory}`))
      } catch {
        /* empty */
      }
    })
  return mentions
}

function computeLastMentionDates(sessions: SessionLog[]): Map<string, Date> {
  const lastMentioned = new Map<string, Date>()
  sessions
    .filter((s) => !s.isCancelled && s.statusName === 'Confirmed' && s.sessionDate)
    .forEach((s) => {
      const sessionDate = new Date(s.sessionDate!)
      try {
        const pairs = JSON.parse(s.mentionedDifficultyPairs || '[]') as {
          Competency: string
          Subcategory: string
        }[]
        pairs.forEach((p) => {
          const key = `${p.Competency}|${p.Subcategory}`
          const existing = lastMentioned.get(key)
          if (!existing || sessionDate > existing) {
            lastMentioned.set(key, sessionDate)
          }
        })
      } catch {
        /* empty */
      }
    })
  return lastMentioned
}

export function ProgressDashboard({ student, sessions }: Props) {
  const baselineNum = CEFR_ORDER[student.cefrLevel] ?? 3
  const baselinePercent = (baselineNum / 6) * 100
  const skillOverrides = student.skillLevelOverrides ?? {}
  const hasSkillData = Object.keys(skillOverrides).length > 0

  // Pacing analytics
  const { completedSessions, firstDate, frequency, cancellationRate, isBehind } =
    useMemo(() => computePacingStats(sessions, student.createdAt), [sessions, student.createdAt])

  // Difficulty classification
  const recentMentions = useMemo(() => computeRecentMentions(sessions), [sessions])
  const lastMentionDates = useMemo(() => computeLastMentionDates(sessions), [sessions])
  const difficulties = student.difficulties ?? []

  const coveredDifficulties = difficulties.filter((d) => d.status === 'Covered')
  const activeDifficulties = difficulties.filter((d) => d.status !== 'Covered')
  const workingDifficulties = activeDifficulties.filter((d) =>
    recentMentions.has(`${d.competency}|${d.subcategory}`),
  )
  const staleDifficulties = activeDifficulties.filter(
    (d) => !recentMentions.has(`${d.competency}|${d.subcategory}`),
  )

  return (
    <div className="space-y-6" data-testid="progress-tab-content">
      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Skill Imbalance Analysis — 8 cols */}
        <div
          className="lg:col-span-8 bg-white rounded-2xl p-8"
          style={{ boxShadow: '0 12px 40px rgba(26,27,34,0.04)' }}
          data-testid="skill-imbalance-section"
        >
          <div className="flex items-start justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-[#1A1B22] mb-1">Skill Imbalance Analysis</h3>
              <p className="text-sm text-zinc-500">
                Skill levels compared to general CEFR level ({student.cefrLevel})
              </p>
            </div>
            {hasSkillData && (
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#3525CD]" />
                  <span className="text-[0.6875rem] font-bold uppercase text-zinc-400 tracking-tighter">
                    Current
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#E8E7F1]" />
                  <span className="text-[0.6875rem] font-bold uppercase text-zinc-400 tracking-tighter">
                    Baseline {student.cefrLevel}
                  </span>
                </div>
              </div>
            )}
          </div>

          {hasSkillData ? (
            <div className="space-y-8">
              {SKILL_ORDER.map((skill) => {
                const level = skillOverrides[skill]
                if (!level) return null
                const width = cefrBarWidth(level)
                const above = isAboveOrAtBaseline(level, student.cefrLevel)
                const hasGap = isGapTwoOrMore(level, student.cefrLevel)
                const barColor = hasGap ? 'bg-amber-400' : above ? 'bg-[#3525CD]' : 'bg-[#C3C0FF]'
                return (
                  <div key={skill} className="relative">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-[#1A1B22]">{skill}</span>
                      <div className="flex items-center gap-2">
                        {hasGap && (
                          <span
                            className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[0.5625rem] font-bold text-amber-700"
                            data-testid={`skill-gap-badge-${skill.toLowerCase()}`}
                          >
                            Gap
                          </span>
                        )}
                        <CefrBadge level={level} />
                      </div>
                    </div>
                    <div className="relative h-3 w-full bg-[#F4F2FD] rounded-full overflow-visible">
                      {/* Baseline reference marker — positioned outside clip context */}
                      <div
                        className="absolute z-10 w-0.5 bg-[#C7C4D8]"
                        style={{ left: `${baselinePercent}%`, top: '-2px', bottom: '-2px' }}
                        aria-label={`Baseline ${student.cefrLevel}`}
                        data-testid={`baseline-marker-${skill.toLowerCase()}`}
                      />
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${width}%` }}
                        data-testid={`skill-bar-${skill.toLowerCase()}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <p className="text-sm text-zinc-500">No skill assessments recorded yet.</p>
              <p className="text-xs text-zinc-400">
                Edit the student profile to add skill-level overrides.
              </p>
            </div>
          )}
        </div>

        {/* Right column — 4 cols */}
        <div className="lg:col-span-4 space-y-5">
          {/* Pacing Analytics */}
          <div className="bg-[#F4F2FD] rounded-2xl p-7" data-testid="pacing-section">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">
              Pacing Analytics
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-3xl font-black text-[#3525CD] mb-1">
                  {completedSessions.length}
                </p>
                <p className="text-xs font-medium text-zinc-600">
                  Total completed session{completedSessions.length !== 1 ? 's' : ''}
                </p>
              </div>

              {(frequency || firstDate) && (
                <div className="flex items-center gap-4 py-4 border-y border-zinc-200/60">
                  {frequency && (
                    <div className="flex-1">
                      <p className="text-lg font-bold text-[#1A1B22]">{frequency}/wk</p>
                      <p className="text-[0.6875rem] font-bold text-zinc-400 uppercase tracking-tighter">
                        Frequency
                      </p>
                    </div>
                  )}
                  {frequency && firstDate && (
                    <div className="w-px h-8 bg-zinc-300/50" />
                  )}
                  {firstDate && (
                    <div className="flex-1">
                      <p className="text-lg font-bold text-[#1A1B22]">
                        {formatStartDate(firstDate)}
                      </p>
                      <p className="text-[0.6875rem] font-bold text-zinc-400 uppercase tracking-tighter">
                        Start Date
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#1A1B22]">Cancellation Rate</p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold ${cancellationRate > 20 ? 'text-amber-600' : 'text-green-600'}`}
                    data-testid="cancellation-rate"
                  >
                    {cancellationRate}%
                  </span>
                </div>
              </div>

              {isBehind && (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#1A1B22]">Pacing Status</p>
                  <TooltipPrimitive.Root>
                    <TooltipPrimitive.Trigger
                      render={
                        <span
                          className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[0.6875rem] font-bold text-amber-700 cursor-help"
                          data-testid="pacing-behind-badge"
                        />
                      }
                    >
                      Behind
                    </TooltipPrimitive.Trigger>
                    <TooltipPrimitive.Portal>
                      <TooltipPrimitive.Positioner side="top" sideOffset={4} className="isolate z-50">
                        <TooltipPrimitive.Popup
                          className="z-50 max-w-xs rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-zinc-700 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
                          style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.10)' }}
                          data-testid="pacing-behind-tooltip"
                        >
                          Behind: fewer sessions completed than expected for this point in the course.
                          Shown when fewer than 1 session/week has been held on average since the start date.
                        </TooltipPrimitive.Popup>
                      </TooltipPrimitive.Positioner>
                    </TooltipPrimitive.Portal>
                  </TooltipPrimitive.Root>
                </div>
              )}
            </div>
          </div>

          {/* Difficulties Summary */}
          {difficulties.length > 0 && (
            <div
              className="bg-white rounded-2xl p-7"
              style={{ boxShadow: '0 1px 3px rgba(26,27,34,0.08)', border: '1px solid rgba(199,196,216,0.15)' }}
              data-testid="difficulties-section"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                Difficulties Summary
              </h3>
              <div className="space-y-3">
                {[...workingDifficulties, ...staleDifficulties, ...coveredDifficulties]
                  .slice(0, 6)
                  .map((d) => {
                    const isWorking = d.status !== 'Covered' &&
                      recentMentions.has(`${d.competency}|${d.subcategory}`)
                    const isStale = d.status !== 'Covered' &&
                      !recentMentions.has(`${d.competency}|${d.subcategory}`)
                    const isCovered = d.status === 'Covered'
                    const lastMentionDate = lastMentionDates.get(`${d.competency}|${d.subcategory}`)
                    const timeSince = lastMentionDate ? formatTimeSince(lastMentionDate) : null

                    return (
                      <div
                        key={d.id}
                        className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0"
                      >
                        <TooltipPrimitive.Root>
                          <TooltipPrimitive.Trigger
                            render={
                              <div className="flex flex-col gap-0.5 mr-2 min-w-0 cursor-default" />
                            }
                          >
                            <span className="text-xs font-bold text-[#1A1B22] truncate max-w-[140px] block">
                              {d.description}
                            </span>
                            <span className="text-[0.5625rem] font-bold uppercase text-zinc-400 block">
                              {d.competency}
                            </span>
                          </TooltipPrimitive.Trigger>
                          <TooltipPrimitive.Portal>
                            <TooltipPrimitive.Positioner side="top" sideOffset={4} className="isolate z-50">
                              <TooltipPrimitive.Popup
                                className="z-50 max-w-xs rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-zinc-700"
                                style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.10)' }}
                                data-testid={`difficulty-tooltip-${d.id}`}
                              >
                                {d.description}
                              </TooltipPrimitive.Popup>
                            </TooltipPrimitive.Positioner>
                          </TooltipPrimitive.Portal>
                        </TooltipPrimitive.Root>
                        <div className="flex items-center gap-1 shrink-0">
                          {timeSince && (
                            <span
                              className="text-[0.5625rem] text-zinc-400"
                              data-testid={`difficulty-time-since-${d.id}`}
                            >
                              {timeSince}
                            </span>
                          )}
                          {isWorking && (
                            <span className="px-2 py-0.5 rounded-full text-[0.5625rem] font-bold bg-[#E2DFFF] text-[#3323CC]">
                              Working
                            </span>
                          )}
                          {isStale && (
                            <span className="px-2 py-0.5 rounded-full text-[0.5625rem] font-bold bg-amber-100 text-amber-700">
                              Stale
                            </span>
                          )}
                          {isCovered && (
                            <span className="px-2 py-0.5 rounded-full text-[0.5625rem] font-bold bg-green-100 text-green-700">
                              Covered
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coming Soon placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="coming-soon-section">
        {/* Curriculum Progress */}
        <div
          className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[220px]"
          style={{
            boxShadow: '0 1px 3px rgba(26,27,34,0.06)',
            border: '2px dashed rgba(199,196,216,0.4)',
          }}
        >
          <div className="w-12 h-12 rounded-full bg-[#E2DFFF] flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-[#3525CD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h4 className="text-xs font-bold text-[#1A1B22] uppercase tracking-wider mb-2">
            Curriculum Progress
          </h4>
          <p className="text-[0.6875rem] font-bold text-[#3525CD] mb-1">Coming Soon</p>
          <p className="text-[0.6875rem] text-zinc-400 max-w-[180px]">
            Track your lesson plan milestones.
          </p>
        </div>

        {/* Topic Analysis */}
        <div
          className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[220px]"
          style={{
            boxShadow: '0 1px 3px rgba(26,27,34,0.06)',
            border: '2px dashed rgba(199,196,216,0.4)',
          }}
        >
          <div className="w-12 h-12 rounded-full bg-[#FFD8C8] flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-[#7E3000]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h4 className="text-xs font-bold text-[#1A1B22] uppercase tracking-wider mb-2">
            Topic Analysis
          </h4>
          <p className="text-[0.6875rem] font-bold text-[#7E3000] mb-1">Coming Soon</p>
          <p className="text-[0.6875rem] text-zinc-400 max-w-[180px]">
            Deep dive into the thematic focus of each session.
          </p>
        </div>

        {/* Engagement Trends */}
        <div
          className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[220px]"
          style={{
            boxShadow: '0 1px 3px rgba(26,27,34,0.06)',
            border: '2px dashed rgba(199,196,216,0.4)',
          }}
        >
          <div className="w-12 h-12 rounded-full bg-[#D0E1FB] flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-[#505F76]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <h4 className="text-xs font-bold text-[#1A1B22] uppercase tracking-wider mb-2">
            Engagement Trends
          </h4>
          <p className="text-[0.6875rem] font-bold text-[#505F76] mb-1">Coming Soon</p>
          <p className="text-[0.6875rem] text-zinc-400 max-w-[180px]">
            How your student's engagement evolves over time.
          </p>
        </div>
      </div>
    </div>
  )
}
