import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { logger } from '../lib/logger'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loginWithRedirect, error } = useAuth0()

  useEffect(() => {
    logger.debug('ProtectedRoute', 'State changed', { isLoading, isAuthenticated, error: error?.message, url: window.location.href })

    if (isLoading || isAuthenticated) return

    const params = new URLSearchParams(window.location.search)
    if (params.has('code') || params.has('error')) {
      logger.debug('ProtectedRoute', 'OAuth callback in progress — skipping redirect')
      return
    }

    logger.info('ProtectedRoute', 'Not authenticated — redirecting to Auth0 login')
    loginWithRedirect()
  }, [isLoading, isAuthenticated, loginWithRedirect, error])

  if (error) {
    logger.error('ProtectedRoute', 'Auth0 error', error)
    return <div>Auth error: {error.message}</div>
  }
  if (isLoading || !isAuthenticated) return <div>Loading...</div>

  return <>{children}</>
}
