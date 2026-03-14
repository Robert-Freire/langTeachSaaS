import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, CalendarDays } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Welcome back. Here's an overview of your teaching activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/students">
          <Card className="cursor-pointer hover:ring-indigo-200 transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">Students</CardTitle>
              <Users className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-zinc-900">—</p>
              <p className="text-xs text-zinc-400 mt-1">View all students</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/lessons" data-testid="lessons-tile">
          <Card className="cursor-pointer hover:ring-indigo-200 transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">Lessons this week</CardTitle>
              <CalendarDays className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-zinc-900">—</p>
              <p className="text-xs text-zinc-400 mt-1">View all lessons</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/lessons" data-testid="active-plans-tile">
          <Card className="cursor-pointer hover:ring-indigo-200 transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">Active plans</CardTitle>
              <BookOpen className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-zinc-900">—</p>
              <p className="text-xs text-zinc-400 mt-1">View all lessons</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
