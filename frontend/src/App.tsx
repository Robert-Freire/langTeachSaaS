import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth0 } from '@auth0/auth0-react'
import { setupAuthInterceptor } from './lib/apiClient'
import { ProtectedRoute } from './components/ProtectedRoute'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Students from './pages/Students'
import StudentForm from './pages/StudentForm'
import Lessons from './pages/Lessons'
import LessonNew from './pages/LessonNew'
import LessonEditor from './pages/LessonEditor'
import StudyView from './pages/StudyView'

const queryClient = new QueryClient()

function AuthSetup({ children }: { children: React.ReactNode }) {
  const { getAccessTokenSilently, logout } = useAuth0()

  useEffect(() => {
    return setupAuthInterceptor(getAccessTokenSilently, () => {
      localStorage.clear()
      logout({ logoutParams: { returnTo: window.location.origin } })
    })
  }, [getAccessTokenSilently, logout])

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthSetup>
            <Routes>
              <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/students" element={<Students />} />
                <Route path="/students/new" element={<StudentForm />} />
                <Route path="/students/:id/edit" element={<StudentForm />} />
                <Route path="/students/:id" element={<Navigate to="/students" replace />} />
                <Route path="/lessons" element={<Lessons />} />
                <Route path="/lessons/new" element={<LessonNew />} />
                <Route path="/lessons/:id" element={<LessonEditor />} />
                <Route path="/lessons/:id/study" element={<StudyView />} />
              </Route>
            </Routes>
          </AuthSetup>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
