import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AppShell from './AppShell'

const mockLogout = vi.fn()
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    user: { name: 'Test User', email: 'test@example.com', picture: '' },
    logout: mockLogout,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

function renderShell() {
  return render(
    <MemoryRouter>
      <AppShell />
    </MemoryRouter>
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the hamburger button for mobile', () => {
    renderShell()
    expect(screen.getByTestId('hamburger-btn')).toBeInTheDocument()
  })

  it('renders the desktop sidebar with lg:flex class', () => {
    renderShell()
    const aside = document.querySelector('aside')
    expect(aside).toBeInTheDocument()
    expect(aside?.className).toContain('lg:flex')
    expect(aside?.className).toContain('hidden')
  })

  it('opens the Sheet drawer when hamburger is clicked', async () => {
    const user = userEvent.setup()
    renderShell()
    const hamburger = screen.getByTestId('hamburger-btn')
    await user.click(hamburger)
    // Sheet content should now be visible with navigation items
    const sheetNav = document.querySelector('[data-slot="sheet-content"]')
    expect(sheetNav).toBeInTheDocument()
  })

  it('renders nav items in both desktop sidebar and mobile drawer', async () => {
    const user = userEvent.setup()
    renderShell()
    // Desktop sidebar has nav items (hidden via CSS but in DOM)
    const dashboardLinks = screen.getAllByText('Dashboard')
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1)

    // Open drawer to see mobile nav
    await user.click(screen.getByTestId('hamburger-btn'))
    const allDashboardLinks = screen.getAllByText('Dashboard')
    expect(allDashboardLinks.length).toBeGreaterThanOrEqual(2)
  })

  it('renders the mobile top bar with logo text', () => {
    renderShell()
    const logoTexts = screen.getAllByText('LangTeach')
    // At least one in mobile top bar and one in desktop sidebar
    expect(logoTexts.length).toBeGreaterThanOrEqual(2)
  })
})
