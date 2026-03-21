import { Navigate, Outlet } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { Skeleton } from '@/components/ui/skeleton'

export function OnboardingGuard() {
  const { data: profile, isLoading } = useProfile()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" data-testid="onboarding-guard-loading">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    )
  }

  if (profile && !profile.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
