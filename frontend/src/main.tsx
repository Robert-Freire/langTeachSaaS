import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0ProviderWithNavigate } from './Auth0ProviderWithNavigate'
import { MockAuth0Provider } from './test-utils/MockAuth0Provider'
import './index.css'
import App from './App'

const isE2ETestMode = import.meta.env.DEV && import.meta.env.VITE_E2E_TEST_MODE === 'true'

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
