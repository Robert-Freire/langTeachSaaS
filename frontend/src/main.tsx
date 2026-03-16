import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { MockAuth0Provider } from './test-utils/MockAuth0Provider'
import './index.css'
import App from './App'

const isE2ETestMode = import.meta.env.DEV && import.meta.env.VITE_E2E_TEST_MODE === 'true'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isE2ETestMode ? (
      <MockAuth0Provider>
        <App />
      </MockAuth0Provider>
    ) : (
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH0_DOMAIN}
        clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        }}
        cacheLocation="localstorage"
      >
        <App />
      </Auth0Provider>
    )}
  </StrictMode>,
)
