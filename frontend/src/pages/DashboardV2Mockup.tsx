/**
 * Dashboard V2 Mockup — visual prototype adopting Stitch's "Atelier" design language.
 * Uses tonal layering, generous spacing, editorial typography, Stitch-style CEFR badges.
 * Route: /dashboard-v2
 * DELETE THIS FILE after the redesign is approved and implemented for real.
 */

import { useAuth0 } from '@auth0/auth0-react'
import { LayoutDashboard, Users, CalendarDays, GraduationCap, BookOpen, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import LangTeachLogo from '@/components/LangTeachLogo'

// ─── Cohort data ─────────────────────────────────────────────────────────────

const NEXT_SESSION = {
  student: 'Matteo Russo',
  initials: 'MR',
  level: 'C1.1',
  l1: 'Italian',
  sessionNumber: 14,
  scheduledTime: '10:30',
  minutesUntil: 35,
  lastSession: {
    daysAgo: 4,
    notes: [
      'Subjuntivo en concesivas, le costó',
      'Deberes: redacción "mi ciudad ideal"',
      'Prometí ejercicios de por/para',
    ],
    homework: '"Mi ciudad ideal"',
    homeworkStatus: 'pending correction',
  },
}

const TODAY_SESSIONS: { time: string; name: string; level: string; status: 'done' | 'next' | 'scheduled' }[] = [
  { time: '09:00', name: 'Nadia El Amrani', level: 'A2.1', status: 'done' },
  { time: '10:30', name: 'Matteo Russo', level: 'C1.1', status: 'next' },
  { time: '12:00', name: 'Elena Volkov', level: 'B1.1', status: 'scheduled' },
  { time: '16:00', name: 'Kevin Brown', level: 'A2.2', status: 'scheduled' },
  { time: '18:30', name: 'Amani Haddad', level: 'A1.1', status: 'scheduled' },
]

const FOLLOWUPS = [
  { text: "Correct Matteo's writing assignment", time: '3 days overdue', severity: 'error' as const },
  { text: "Send 'Gustar' exercise pack to Oksana", time: '2 days ago', severity: 'warning' as const },
  { text: 'Register Tuesday session with Elena', time: 'yesterday', severity: 'neutral' as const },
  { text: 'Confirm new tuition rates with Paula', time: 'today', severity: 'warning' as const },
]

const ACTIVE_STUDENTS = [
  { name: 'Ewan McLeod', level: 'A1.2', l1: 'English', lastSession: '5d ago', nextSession: 'Mon', signal: null },
  { name: 'Bruno Almeida', level: 'B1.2', l1: 'Portuguese', lastSession: '12d ago', nextSession: null, signal: { text: 'Inactive 12d', color: 'red' as const } },
  { name: 'Elena Volkov', level: 'B1.1', l1: 'Russian', lastSession: 'yesterday', nextSession: 'today 12:00', signal: null },
  { name: 'Amani Haddad', level: 'A1.1', l1: 'Arabic', lastSession: '3d ago', nextSession: 'today 18:30', signal: null },
  { name: 'Nadia El Amrani', level: 'A2.1', l1: 'French', lastSession: 'today', nextSession: 'Thu', signal: null },
  { name: 'Kevin Brown', level: 'A2.2', l1: 'English', lastSession: '2d ago', nextSession: 'today 16:00', signal: null },
  { name: 'Oksana Petrenko', level: 'B1.1', l1: 'Ukrainian', lastSession: '5d ago', nextSession: 'Fri', signal: { text: 'Active', color: 'green' as const } },
  { name: 'Paula Moretti', level: 'B2.1', l1: 'Italian', lastSession: '6d ago', nextSession: 'Wed', signal: { text: 'New', color: 'zinc' as const } },
  { name: 'Rona Díaz', level: 'B1.1', l1: 'Romanian', lastSession: '8d ago', nextSession: null, signal: { text: 'Canceled 2x', color: 'warning' as const } },
  { name: 'Sandra Okafor', level: 'A2.1', l1: 'English', lastSession: '4d ago', nextSession: 'Mon', signal: null },
  { name: 'Michael Chen', level: 'A1.2', l1: 'English', lastSession: '3d ago', nextSession: 'Fri', signal: null },
  { name: 'Matteo Russo', level: 'C1.1', l1: 'Italian', lastSession: '4d ago', nextSession: 'today 10:30', signal: { text: 'Review pending', color: 'warning' as const } },
]

// ─── Stitch-style CEFR badge (square, solid fill) ────────────────────────────

function CefrBadge({ level }: { level: string }) {
  const base = level.substring(0, 1)
  const colors = {
    A: 'bg-blue-100 text-blue-700',
    B: 'bg-indigo-100 text-indigo-700',
    C: 'bg-zinc-900 text-white',
  }[base] ?? 'bg-indigo-100 text-indigo-700'

  return (
    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${colors}`}>
      {level}
    </span>
  )
}

// ─── Signal badge (Stitch style: colored bg + uppercase) ─────────────────────

function SignalBadge({ signal }: { signal: { text: string; color: 'red' | 'warning' | 'zinc' | 'green' } }) {
  const styles = {
    red: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-700',
    zinc: 'bg-zinc-100 text-zinc-500',
    green: 'text-emerald-500',
  }
  if (signal.color === 'green') {
    return <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
  }
  return (
    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${styles[signal.color]}`}>
      {signal.text}
    </span>
  )
}

// ─── Followup severity badge ─────────────────────────────────────────────────

function SeverityBadge({ time, severity }: { time: string; severity: 'error' | 'warning' | 'neutral' }) {
  const styles = {
    error: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-700',
    neutral: 'text-zinc-400',
  }
  return (
    <span className={`text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap ${severity !== 'neutral' ? `px-2 py-0.5 rounded ${styles[severity]}` : styles[severity]}`}>
      {time}
    </span>
  )
}

// ─── Section label (uppercase, tracked) ──────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
      {children}
    </span>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

// ─── Stitch-style sidebar ────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Students', icon: Users, active: false },
  { label: 'Sessions', icon: CalendarDays, active: false },
  { label: 'Courses', icon: GraduationCap, active: false },
  { label: 'Lessons', icon: BookOpen, active: false },
  { label: 'Settings', icon: Settings, active: false },
]

function StitchSidebar() {
  const { user } = useAuth0()
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'JR'

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-white border-r border-zinc-100 flex flex-col py-8 z-50">
      {/* Logo */}
      <div className="mb-10 px-8">
        <div className="flex items-center gap-2.5">
          <LangTeachLogo size={28} />
          <span className="text-indigo-600 font-extrabold text-xl tracking-tight">LangTeach</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mt-1 ml-[38px]">
          Language Curator
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
          <a
            key={label}
            href="#"
            onClick={(e) => e.preventDefault()}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
              active
                ? 'bg-indigo-50 text-indigo-600 font-semibold border-l-[3px] border-l-indigo-600 rounded-r-lg'
                : 'text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg'
            }`}
          >
            <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-indigo-600' : ''}`} />
            {label}
          </a>
        ))}
      </nav>

      {/* User card */}
      <div className="mt-auto px-4">
        <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.picture} alt={user?.name} />
            <AvatarFallback className="bg-indigo-600 text-white text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-zinc-900 truncate">{user?.name ?? 'Jordi R.'}</span>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Teacher</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function DashboardV2Mockup() {
  const s = NEXT_SESSION

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <StitchSidebar />

      {/* Main content */}
      <div className="ml-64 flex-1 min-h-screen overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center h-20 px-10 bg-zinc-50/80 backdrop-blur-sm sticky top-0 z-40">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Dashboard</h1>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mt-0.5">Tuesday, April 9</p>
          </div>
        </header>

        <div className="px-10 pb-12 space-y-10">

      {/* ─── ZONE 1: Next Session Hero ─── */}
      <section className="bg-white rounded-2xl p-8 lg:p-10 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] relative overflow-hidden">
        {/* Subtle gradient decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Top row: countdown + actions */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
                  In {s.minutesUntil} min
                </span>
                <span className="text-xs font-semibold text-zinc-400">Starts at {s.scheduledTime}</span>
              </div>
              <div className="flex items-center gap-4">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-zinc-900 tracking-tight">{s.student}</h2>
                <CefrBadge level={s.level} />
                <div className="h-4 w-px bg-zinc-200" />
                <span className="text-sm font-medium text-zinc-400">{s.l1} · Session #{s.sessionNumber}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="px-6 h-11 rounded-xl text-sm font-bold">
                Open profile
              </Button>
              <Button className="px-8 h-11 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                Start session
              </Button>
            </div>
          </div>

          {/* Last session briefing + homework card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 pt-8 border-t border-zinc-100">
            {/* Briefing */}
            <div className="lg:col-span-2">
              <SectionLabel>Last session briefing</SectionLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-4">
                {s.lastSession.notes.map((note, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                    <span className="text-sm text-zinc-500 leading-relaxed">{note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Homework status card */}
            <div className="bg-zinc-50 rounded-2xl p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Homework status</span>
              </div>
              <p className="text-sm font-semibold text-zinc-800 italic">
                {s.lastSession.homework} — {s.lastSession.homeworkStatus}
              </p>
              <button className="text-[11px] font-bold text-indigo-600 uppercase mt-3 hover:underline text-left tracking-wider">
                View task
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ZONE 2: Today's Agenda + Followups ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">

        {/* Today's Agenda */}
        <section className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-extrabold text-zinc-900 tracking-tight">Today's Agenda</h3>
            <button className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
              Calendar view
            </button>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
            {TODAY_SESSIONS.map((session, i) => (
              <div
                key={i}
                className={`flex items-center gap-5 px-5 py-4 relative transition-colors ${
                  session.status === 'next'
                    ? 'bg-white'
                    : session.status === 'done'
                    ? 'bg-zinc-50/50 opacity-60'
                    : 'bg-white hover:bg-zinc-50'
                } ${i > 0 ? 'border-t border-zinc-100/60' : ''}`}
              >
                {/* Active session left bar */}
                {session.status === 'next' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                )}

                <span className={`text-xs font-bold w-11 text-right ${
                  session.status === 'next' ? 'text-indigo-600' : 'text-zinc-400'
                }`}>
                  {session.time}
                </span>

                <span className={`text-sm font-bold flex-1 ${
                  session.status === 'next' ? 'text-indigo-600' : 'text-zinc-800'
                }`}>
                  {session.name}
                </span>

                <CefrBadge level={session.level} />

                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  session.status === 'done'
                    ? 'text-emerald-600 flex items-center gap-1'
                    : session.status === 'next'
                    ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded'
                    : 'text-zinc-400'
                }`}>
                  {session.status === 'done' && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>
                  )}
                  {session.status === 'done' ? 'Done' : session.status === 'next' ? 'Next session' : 'Scheduled'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Followups */}
        <section className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-extrabold text-zinc-900 tracking-tight">Pending Followups</h3>
            <button className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
              See all (12)
            </button>
          </div>
          <div className="space-y-3">
            {FOLLOWUPS.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 p-4 bg-white rounded-2xl shadow-[0_1px_8px_-2px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_2px_12px_-3px_rgba(0,0,0,0.1)] ${
                  item.severity === 'neutral' ? 'opacity-70' : ''
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  item.severity === 'error' ? 'bg-amber-500 ring-4 ring-amber-500/10' :
                  item.severity === 'warning' ? 'bg-amber-500 ring-4 ring-amber-500/10' :
                  'bg-zinc-300'
                }`} />
                <span className="text-sm font-medium text-zinc-700 flex-1">{item.text}</span>
                <SeverityBadge time={item.time} severity={item.severity} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ─── ZONE 3: Student Roster ─── */}
      <section className="space-y-5">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-extrabold text-zinc-900 tracking-tight">Student Roster</h3>
            <p className="text-xs text-zinc-400 mt-0.5">24 active enrollments</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 bg-white px-3 py-2 rounded-lg shadow-sm">
            Sort by: Last Session
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] border-b border-zinc-100">
                <th className="py-4 pl-6 pr-3">Name</th>
                <th className="py-4 px-3 w-16">Level</th>
                <th className="py-4 px-3 w-24">L1</th>
                <th className="py-4 px-3 w-24">Last session</th>
                <th className="py-4 px-3 w-28">Next session</th>
                <th className="py-4 px-3 pr-6 w-36 text-right">Activity signal</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVE_STUDENTS.map((student, i) => {
                const isHighlighted = student.name === 'Matteo Russo'
                return (
                  <tr
                    key={i}
                    className={`transition-colors cursor-pointer ${
                      i < ACTIVE_STUDENTS.length - 1 ? 'border-b border-zinc-50' : ''
                    } hover:bg-zinc-50/80`}
                  >
                    <td className="py-3.5 pl-6 pr-3">
                      <span className={`text-sm font-bold ${isHighlighted ? 'text-indigo-600' : 'text-zinc-800'}`}>
                        {student.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <CefrBadge level={student.level} />
                    </td>
                    <td className="py-3.5 px-3 text-sm text-zinc-400">{student.l1}</td>
                    <td className="py-3.5 px-3 text-sm text-zinc-400">{student.lastSession}</td>
                    <td className="py-3.5 px-3">
                      <span className={`text-sm font-semibold ${
                        isHighlighted ? 'text-indigo-600' :
                        student.nextSession?.startsWith('today') ? 'text-zinc-700' : 'text-zinc-400'
                      }`}>
                        {student.nextSession ?? <span className="text-zinc-300">&mdash;</span>}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 pr-6 text-right">
                      {student.signal ? <SignalBadge signal={student.signal} /> : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="py-4 text-center border-t border-zinc-100">
            <button className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest hover:underline">
              View entire student base
            </button>
          </div>
        </div>
      </section>
        </div>
      </div>
    </div>
  )
}
