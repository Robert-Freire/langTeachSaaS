import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth0 } from '@auth0/auth0-react'
import { Toaster } from 'sonner'
import { apiClient, setupAuthInterceptor } from './lib/apiClient'
import { ProtectedRoute } from './components/ProtectedRoute'
import { OnboardingGuard } from './components/OnboardingGuard'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Students from './pages/Students'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import GroupLogSession from './pages/GroupLogSession'
import GroupForm from './pages/GroupForm'
import StudentForm from './pages/StudentForm'
import Lessons from './pages/Lessons'
import LessonNew from './pages/LessonNew'
import LessonEditor from './pages/LessonEditor'
import StudyView from './pages/StudyView'
import Courses from './pages/Courses'
import CourseNew from './pages/CourseNew'
import CourseDetail from './pages/CourseDetail'
import StudentDetail from './pages/StudentDetail'
import RedaccionDetail from './pages/RedaccionDetail'
import LogSession from './pages/LogSession'
import Sessions from './pages/Sessions'
import Onboarding from './pages/Onboarding'

const queryClient = new QueryClient()

function AuthSetup({ children }: { children: React.ReactNode }) {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0()

  useEffect(() => {
    return setupAuthInterceptor(
      apiClient,
      (opts) =>
        getAccessTokenSilently(
          opts?.forceRefresh ? { cacheMode: 'off' } : undefined,
        ),
      () => {
        const returnTo =
          window.location.pathname + window.location.search + window.location.hash
        loginWithRedirect({ appState: { returnTo } }).catch((err) => {
          // Auth0 unreachable or redirect blocked. Log so it surfaces in
          // devtools instead of becoming an unhandled rejection. No toast
          // infra to surface this to the user yet (see #1117 QA gap on
          // auth-down vs session-expired copy).
          console.error('Re-authentication redirect failed', err)
        })
      },
    )
  }, [getAccessTokenSilently, loginWithRedirect])

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="bottom-right" richColors />
        <AuthSetup>
          <Routes>
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route element={<ProtectedRoute><OnboardingGuard /></ProtectedRoute>}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/students/new" element={<StudentForm />} />
                  <Route path="/students/:id/edit" element={<StudentForm />} />
                  <Route path="/students/:id/log-session" element={<LogSession />} />
                  <Route path="/students/:id/sessions/:sessionId/edit" element={<LogSession />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/groups/new" element={<GroupForm />} />
                  <Route path="/groups/:id" element={<GroupDetail />} />
                  <Route path="/groups/:id/edit" element={<GroupForm />} />
                  <Route path="/groups/:id/log-session" element={<GroupLogSession />} />
                  <Route path="/groups/:id/sessions/:sessionId/edit" element={<GroupLogSession />} />
                  <Route path="/sessions" element={<Sessions />} />
                  <Route path="/students/:id" element={<StudentDetail />} />
                  <Route path="/students/:id/redacciones/:correctionId" element={<RedaccionDetail />} />
                  <Route path="/lessons" element={<Lessons />} />
                  <Route path="/lessons/new" element={<LessonNew />} />
                  <Route path="/lessons/:id" element={<LessonEditor />} />
                  <Route path="/lessons/:id/study" element={<StudyView />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/courses/new" element={<CourseNew />} />
                  <Route path="/courses/:id" element={<CourseDetail />} />
                </Route>
              </Route>
          </Routes>
        </AuthSetup>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
