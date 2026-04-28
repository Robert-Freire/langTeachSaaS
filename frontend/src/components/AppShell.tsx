import { useState, useEffect, type ElementType } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, Users, CalendarDays, BookOpen, GraduationCap, Settings, LogOut, Menu, Sparkles, HelpCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import LangTeachLogo from '@/components/LangTeachLogo'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
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

function SidebarContent({ user, initials, logout, location, assistantOpen, onToggleAssistant }: {
  user: ReturnType<typeof useAuth0>['user']
  initials: string
  logout: ReturnType<typeof useAuth0>['logout']
  location: ReturnType<typeof useLocation>
  assistantOpen: boolean
  onToggleAssistant: () => void
}) {
  return (
    <>
      {/* Logo + subtitle */}
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-2.5">
          <LangTeachLogo size={28} />
          <span className="text-primary font-extrabold text-xl tracking-tight font-manrope">LangTeach</span>
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

      {/* Open Assistant zone */}
      <div className="px-3 pb-3 pt-4">
        <button
          onClick={onToggleAssistant}
          aria-haspopup="dialog"
          aria-expanded={assistantOpen}
          aria-label="Open Assistant"
          data-testid="open-assistant-btn"
          className={cn(
            'w-full flex items-center gap-2.5 px-5 py-3.5 rounded-xl font-inter font-semibold text-sm text-white',
            'bg-[linear-gradient(135deg,var(--color-primary),#4F46E5)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            'transition-all duration-150',
            assistantOpen
              ? 'brightness-90 shadow-inner'
              : 'hover:shadow-[0_4px_16px_0_rgb(53_37_205_/_0.22)] hover:brightness-105 active:brightness-90'
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          Open Assistant
        </button>
        <p className="text-center text-[0.625rem] font-inter text-zinc-400 mt-1.5 tracking-wider select-none">
          ⌘K
        </p>
      </div>

      {/* Bottom: Help + Settings (visually separated) + teacher profile with tucked logout */}
      <div className="px-3 py-4 space-y-3">
        <div className="pt-2 space-y-0.5">
          <NavLink to="/help" label="Help" icon={HelpCircle} location={location} />
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

export default function AppShell() {
  const { user, logout } = useAuth0()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)

  const studentId = extractStudentId(location.pathname)
  const sessionId = extractSessionId(location.pathname)

  const { data: studentData } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId!),
    enabled: studentId !== null,
    select: (s) => s.name,
  })

  const assistant = useAtelierAssistant(studentId, sessionId)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setAssistantOpen(open => !open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const toggleAssistant = () => setAssistantOpen(open => !open)

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBF8FF]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#F4F2FD]">
        <SidebarContent
          user={user}
          initials={initials}
          logout={logout}
          location={location}
          assistantOpen={assistantOpen}
          onToggleAssistant={toggleAssistant}
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
          <span className="text-primary font-bold text-base tracking-tight font-manrope">LangTeach</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleAssistant}
            aria-label="Open Assistant"
            aria-haspopup="dialog"
            aria-expanded={assistantOpen}
            data-testid="open-assistant-mobile-btn"
            className="h-8 w-8 rounded-full flex items-center justify-center bg-[linear-gradient(135deg,var(--color-primary),#4F46E5)] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
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
              assistantOpen={assistantOpen}
              onToggleAssistant={() => { setDrawerOpen(false); setAssistantOpen(true) }}
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

      {/* Atelier Assistant panel */}
      <AtelierAssistantPanel
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onCloseDiscarding={() => { setAssistantOpen(false); assistant.reset() }}
        studentName={studentData}
        transcription={assistant.transcription}
        processing={assistant.processing}
        proposals={assistant.proposals}
        onSubmit={assistant.submit}
        onApply={assistant.apply}
        onDismiss={assistant.dismiss}
        onUndo={assistant.undoDismiss}
        onRetry={assistant.apply}
        onApplyAll={assistant.applyAll}
        onDismissAll={assistant.dismissAll}
        onEditPayload={assistant.onEditPayload}
      />
    </div>
  )
}
