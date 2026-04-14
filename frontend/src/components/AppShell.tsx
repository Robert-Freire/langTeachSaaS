import { useState, useEffect, type ElementType } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { LayoutDashboard, Users, CalendarDays, BookOpen, GraduationCap, Settings, LogOut, Menu } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import LangTeachLogo from '@/components/LangTeachLogo'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const mainNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/sessions', label: 'Sessions', icon: CalendarDays },
  { to: '/courses', label: 'Courses', icon: GraduationCap },
  { to: '/lessons', label: 'Lessons', icon: BookOpen },
]

function NavLink({ to, label, icon: Icon, location }: {
  to: string
  label: string
  icon: ElementType
  location: ReturnType<typeof useLocation>
}) {
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 py-2.5 pl-4 pr-3 text-base font-medium font-inter transition-colors',
        active
          ? 'bg-white border-l-[3px] border-l-indigo-600 text-indigo-700 rounded-r-md'
          : 'text-zinc-500 hover:bg-[#E6E0F8] hover:text-zinc-900 rounded-md border-l-[3px] border-l-transparent'
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-indigo-600' : 'text-zinc-400')} />
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
          <span className="text-indigo-600 font-extrabold text-xl tracking-tight font-manrope">LangTeach</span>
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

      {/* Bottom: Settings (visually separated) + teacher profile with tucked logout */}
      <div className="px-3 py-4 space-y-3">
        <div className="border-t border-zinc-200/60 pt-3">
          <NavLink to="/settings" label="Settings" icon={Settings} location={location} />
        </div>
        <div className="bg-white rounded-xl p-3 flex items-center gap-3" data-testid="teacher-profile-card">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user?.picture} alt={user?.name} />
            <AvatarFallback className="bg-indigo-600 text-white text-xs font-semibold">{initials}</AvatarFallback>
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

export default function AppShell() {
  const { user, logout } = useAuth0()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBF8FF]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#F4F2FD]">
        <SidebarContent user={user} initials={initials} logout={logout} location={location} />
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
          <span className="text-indigo-600 font-bold text-base tracking-tight font-manrope">LangTeach</span>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.picture} alt={user?.name} />
          <AvatarFallback className="bg-indigo-600 text-white text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="bg-[#F4F2FD] p-0">
          <div className="flex flex-col h-full">
            <SidebarContent user={user} initials={initials} logout={logout} location={location} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 pt-18 lg:p-6 lg:pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
