import { Auth0Provider } from '@auth0/auth0-react'
import type { AppState } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'

export function Auth0ProviderWithNavigate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
      cacheLocation="localstorage"
      onRedirectCallback={(appState?: AppState) => {
        const target =
          appState && typeof appState.returnTo === 'string'
            ? appState.returnTo
            : window.location.pathname
        navigate(target, { replace: true })
      }}
    >
      {children}
    </Auth0Provider>
  )
}
