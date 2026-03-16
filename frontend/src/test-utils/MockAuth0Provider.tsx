import { type ReactNode } from 'react'
import { Auth0Context, type Auth0ContextInterface, type User } from '@auth0/auth0-react'

const mockUser: User = {
  sub: 'auth0|e2e-test-teacher',
  email: 'e2e-test@langteach.io',
  name: 'E2E Teacher',
}

const mockContext: Auth0ContextInterface<User> = {
  isAuthenticated: true,
  isLoading: false,
  user: mockUser,
  error: undefined,
  loginWithRedirect: async () => {},
  loginWithPopup: async () => {},
  logout: async () => {},
  getAccessTokenSilently: async () => 'test-token' as never,
  getAccessTokenWithPopup: async () => undefined,
  getIdTokenClaims: async () => undefined,
  handleRedirectCallback: async () => ({ appState: undefined }) as never,
  connectAccountWithRedirect: async () => {},
  createFetcher: () => (() => {}) as never,
  generateDpopProof: async () => '',
  getConfiguration: () => ({}) as never,
  getDpopNonce: async () => undefined,
  exchangeToken: async () => ({}) as never,
  loginWithCustomTokenExchange: async () => ({}) as never,
  mfa: {} as never,
  setDpopNonce: async () => {},
}

export function MockAuth0Provider({ children }: { children: ReactNode }) {
  return (
    <Auth0Context.Provider value={mockContext}>
      {children}
    </Auth0Context.Provider>
  )
}
