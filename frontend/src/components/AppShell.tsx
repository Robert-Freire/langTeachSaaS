import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { LayoutDashboard, UserCircle, Users, BookOpen, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/settings', label: 'My Profile', icon: UserCircle },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/lessons', label: 'Lessons', icon: BookOpen },
]

export default function AppShell() {
  const { user, logout } = useAuth0()
  const location = useLocation()

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-indigo-950 text-indigo-300">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-indigo-900">
          <span className="text-white font-semibold text-lg tracking-tight">LangTeach</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-800 text-white'
                    : 'text-indigo-300 hover:bg-indigo-900 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-indigo-900 px-3 py-4 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="bg-indigo-600 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-indigo-200 truncate">{user?.name ?? user?.email}</span>
          </div>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-900 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
