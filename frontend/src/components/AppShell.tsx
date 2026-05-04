import { useState, useEffect, type ElementType } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, Users, CalendarDays, BookOpen, GraduationCap, Settings, LogOut, Menu, Sparkles, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import LangTeachLogo from '@/components/LangTeachLogo'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import AtelierAssistantPanel from '@/components/AtelierAssistantPanel'
import { useAtelierAssistant } from '@/hooks/useAtelierAssistant'
import { getStudent } from '@/api/students'

const mainNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/sessions', label: 'Sessions', icon: CalendarDays },
  { to: '/courses', label: 'Courses', icon: GraduationCap },
  { to: '/lessons', label: 'Lessons', icon: BookOpen },
]

const SESSION_EDIT_RE = /^\/students\/[^/]+\/sessions\/[^/]+\/edit$/

function getEffectiveNavPath(location: ReturnType<typeof useLocation>): string {
  if (SESSION_EDIT_RE.test(location.pathname) && (location.state as Record<string, unknown> | null)?.from === 'sessions') {
    return '/sessions'
  }
  return location.pathname
}

function NavLink({ to, label, icon: Icon, location }: {
  to: string
  label: string
  icon: ElementType
  location: ReturnType<typeof useLocation>
}) {
  const effectivePath = getEffectiveNavPath(location)
  const active = effectivePath === to || (to !== '/' && effectivePath.startsWith(`${to}/`))
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 py-2.5 pl-4 pr-3 text-base font-medium font-inter transition-colors',
        active
          ? 'border-l-[3px] border-l-primary text-indigo-700 rounded-r-md'
          : 'text-zinc-500 hover:bg-[#E6E0F8] hover:text-zinc-900 rounded-md border-l-[3px] border-l-transparent'
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-primary' : 'text-zinc-400')} />
      {label}
    </Link>
  )
}

function SidebarContent({ user, initials, logout, location }: {
  user: ReturnType<typeof useAuth0>['user']
  initials: string
  logout: ReturnType<typeof useAuth0>['logout']
  location: ReturnType<typeof useLocation>
}) {
  return (
    <>
      {/* Logo + subtitle */}
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-2.5">
          <LangTeachLogo size={28} />
          <span className="text-primary font-extrabold text-xl tracking-tight font-manrope">Atelier</span>
        </div>
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 mt-1 ml-[38px] font-inter">
          Language Curator
        </p>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {mainNavItems.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} label={label} icon={icon} location={location} />
        ))}
      </nav>

      {/* Bottom: Settings + teacher profile with tucked logout */}
      <div className="px-3 py-4 space-y-3 mt-auto">
        <div className="pt-2 space-y-0.5">
          <NavLink to="/settings" label="Settings" icon={Settings} location={location} />
        </div>
        <div className="bg-white rounded-xl p-3 flex items-center gap-3" data-testid="teacher-profile-card">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user?.picture} alt={user?.name} />
            <AvatarFallback className="bg-primary text-white text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden min-w-0 flex-1">
            <span className="text-sm font-bold text-zinc-900 truncate font-inter">{user?.name ?? user?.email}</span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter">Teacher</span>
          </div>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            aria-label="Log out"
            title="Log out"
            className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors p-1.5 rounded-lg shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}

const STUDENT_ID_RE = /^\/students\/([^/]+)/
const SESSION_ID_RE = /^\/students\/[^/]+\/sessions\/([^/]+)/

function extractStudentId(pathname: string): string | null {
  const match = pathname.match(STUDENT_ID_RE)
  if (!match) return null
  return match[1] === 'new' ? null : match[1]
}

function extractSessionId(pathname: string): string | null {
  const match = pathname.match(SESSION_ID_RE)
  return match ? match[1] : null
}

// Returns true only when the route has a concrete entity anchor.
// `/students` is explicitly OR'd because STUDENT_ID_RE requires a segment
// after "students" and does not match the list route itself.
function isAtelierEnabled(pathname: string): boolean {
  return pathname === '/students' || extractStudentId(pathname) !== null
}

export default function AppShell() {
  const { user, logout } = useAuth0()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userWantsOpen, setUserWantsOpen] = useState(false)

  const studentId = extractStudentId(location.pathname)
  const sessionId = extractSessionId(location.pathname)
  const atelierEnabled = isAtelierEnabled(location.pathname)
  const assistantOpen = userWantsOpen && atelierEnabled

  const { data: studentData } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId!),
    enabled: studentId !== null,
    select: (s) => s.name,
  })

  const assistant = useAtelierAssistant(studentId, sessionId)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setDrawerOpen(false)
    if (!isAtelierEnabled(location.pathname)) {
      setUserWantsOpen(false)
      assistant.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        if (!atelierEnabled) return
        e.preventDefault()
        setUserWantsOpen(open => !open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [atelierEnabled])

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const toggleAssistant = () => { if (atelierEnabled) setUserWantsOpen(open => !open) }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBF8FF]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#F4F2FD]">
        <SidebarContent
          user={user}
          initials={initials}
          logout={logout}
          location={location}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-20 lg:hidden flex items-center justify-between bg-white border-b border-zinc-100 px-3 h-14">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="h-11 w-11"
          data-testid="hamburger-btn"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <LangTeachLogo size={24} />
          <span className="text-primary font-bold text-base tracking-tight font-manrope">Atelier</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={toggleAssistant}
                  aria-label="Open Assistant"
                  aria-haspopup={atelierEnabled ? 'dialog' : undefined}
                  aria-expanded={atelierEnabled ? assistantOpen : undefined}
                  aria-disabled={!atelierEnabled || undefined}
                  data-testid="open-assistant-mobile-btn"
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center lt-gradient-primary text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-all',
                    !atelierEnabled && 'opacity-50 cursor-not-allowed'
                  )}
                />
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {atelierEnabled
                ? (assistantOpen ? 'Close Assistant' : 'Open Assistant')
                : 'Open a student or session to use the assistant'}
            </TooltipContent>
          </Tooltip>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.picture} alt={user?.name} />
            <AvatarFallback className="bg-primary text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="bg-[#F4F2FD] p-0">
          <div className="flex flex-col h-full">
            <SidebarContent
              user={user}
              initials={initials}
              logout={logout}
              location={location}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 pt-18 lg:p-6 lg:pt-6">
          <Outlet />
        </main>
      </div>

      {/* Atelier Assistant FAB (desktop only; mobile uses top-bar button) */}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={toggleAssistant}
              aria-haspopup={atelierEnabled ? 'dialog' : undefined}
              aria-expanded={atelierEnabled ? assistantOpen : undefined}
              aria-disabled={!atelierEnabled || undefined}
              aria-label={assistantOpen ? 'Close Assistant' : 'Open Assistant'}
              data-testid="open-assistant-btn"
              className={cn(
                'hidden lg:flex fixed bottom-6 right-6 z-30',
                'h-14 w-14 items-center justify-center rounded-full text-white',
                'lt-gradient-primary',
                'shadow-[0_12px_40px_0_rgb(26_27_34_/_0.10),0_4px_16px_0_rgb(53_37_205_/_0.18)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                'transition-all duration-150',
                !atelierEnabled
                  ? 'opacity-50 cursor-not-allowed'
                  : assistantOpen
                    ? 'brightness-75'
                    : 'hover:brightness-105 hover:shadow-[0_16px_48px_0_rgb(53_37_205_/_0.28)] active:brightness-90'
              )}
            />
          }
        >
          {assistantOpen ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </TooltipTrigger>
        <TooltipContent side="left">
          {atelierEnabled
            ? <>Open Assistant <kbd data-slot="kbd">⌘K</kbd></>
            : 'Open a student or session to use the assistant'}
        </TooltipContent>
      </Tooltip>

      {/* Atelier Assistant panel */}
      <AtelierAssistantPanel
        open={assistantOpen}
        onClose={() => { setUserWantsOpen(false); assistant.reset() }}
        onCloseDiscarding={() => { setUserWantsOpen(false); assistant.reset() }}
        studentName={studentData}
        transcription={assistant.transcription}
        processing={assistant.processing}
        proposals={assistant.proposals}
        onSubmit={assistant.submit}
        onApply={assistant.apply}
        onDismiss={assistant.dismiss}
        onUndo={assistant.undoDismiss}
        onRetry={assistant.apply}
        onModify={assistant.modifyProposal}
        onApplyAll={assistant.applyAll}
        onDismissAll={assistant.dismissAll}
        onEditPayload={assistant.onEditPayload}
        studentId={studentId}
      />
    </div>
  )
}
