import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { LayoutDashboard, UserCircle, Users, BookOpen, GraduationCap, LogOut, Menu } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import LangTeachLogo from '@/components/LangTeachLogo'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/settings', label: 'My Profile', icon: UserCircle },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/lessons', label: 'Lessons', icon: BookOpen },
  { to: '/courses', label: 'Courses', icon: GraduationCap },
]

function SidebarContent({ user, initials, logout, location }: {
  user: ReturnType<typeof useAuth0>['user']
  initials: string
  logout: ReturnType<typeof useAuth0>['logout']
  location: ReturnType<typeof useLocation>
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-2.5">
        <LangTeachLogo size={28} />
        <span className="text-indigo-600 font-bold text-lg tracking-tight">LangTeach</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-muted-foreground hover:bg-zinc-100 hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-indigo-600' : 'text-muted-foreground/60')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-border px-3 py-4 mt-2 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user?.picture} alt={user?.name} />
            <AvatarFallback className="bg-indigo-600 text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground truncate" title={user?.email}>{user?.name ?? user?.email}</span>
        </div>
        <button
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-zinc-100 hover:text-foreground transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0 text-zinc-400" />
          Log out
        </button>
      </div>
    </>
  )
}

export default function AppShell() {
  const { user, logout } = useAuth0()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Auto-close drawer on navigation (sync with router state)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-border">
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
          <span className="text-indigo-600 font-bold text-base tracking-tight">LangTeach</span>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.picture} alt={user?.name} />
          <AvatarFallback className="bg-indigo-600 text-white text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
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
