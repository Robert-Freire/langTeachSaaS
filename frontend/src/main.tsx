import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import type { AppState } from '@auth0/auth0-react'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { MockAuth0Provider } from './test-utils/MockAuth0Provider'
import './index.css'
import App from './App'

const isE2ETestMode = import.meta.env.DEV && import.meta.env.VITE_E2E_TEST_MODE === 'true'

function Auth0ProviderWithNavigate({ children }: { children: React.ReactNode }) {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isE2ETestMode ? (
      <BrowserRouter>
        <MockAuth0Provider>
          <App />
        </MockAuth0Provider>
      </BrowserRouter>
    ) : (
      <BrowserRouter>
        <Auth0ProviderWithNavigate>
          <App />
        </Auth0ProviderWithNavigate>
      </BrowserRouter>
    )}
  </StrictMode>,
)
