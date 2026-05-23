import { render, screen, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppShell from './AppShell'

vi.mock('../api/assistant', () => ({
  proposeAssistant: vi.fn().mockResolvedValue({ proposals: [] }),
  applyStudentProposal: vi.fn().mockResolvedValue(undefined),
  applySessionProposal: vi.fn().mockResolvedValue(undefined),
  applyTodoProposal: vi.fn().mockResolvedValue(undefined),
}))
import { proposeAssistant } from '../api/assistant'
const mockPropose = proposeAssistant as ReturnType<typeof vi.fn>

const mockLogout = vi.fn()
vi.mock('../api/students', () => ({
  getStudent: vi.fn().mockResolvedValue({ id: '123', name: 'Ana García' }),
}))

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    user: { name: 'Test User', email: 'test@example.com', picture: '' },
    logout: mockLogout,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

vi.mock('../hooks/useProfile', () => ({
  useProfile: () => ({
    data: {
      id: '1', displayName: 'Test', teachingLanguages: [], cefrLevels: [],
      preferredStyle: '', hasCompletedOnboarding: true, hasSettings: true,
      hasStudents: false, hasLessons: false,
      generationsUsedThisMonth: 5, generationsMonthlyLimit: 50, subscriptionTier: 'Free',
    },
  }),
}))

function renderShell(initialPath = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppShell />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function renderShellWithRouter(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '*', element: <AppShell /> }], { initialEntries: [initialPath] })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return { ...utils, router }
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

  it('renders nav items in correct order: Dashboard, Students, Sessions, Courses, then Settings separated at bottom', () => {
    renderShell()
    const links = document.querySelector('aside')?.querySelectorAll('a')
    const labels = Array.from(links ?? []).map(a => a.textContent?.trim())
    expect(labels).toEqual(['Dashboard', 'Students', 'Sessions', 'Courses', 'Settings'])
  })

  it('Settings link is outside the main nav element', () => {
    renderShell()
    const nav = screen.getByRole('navigation')
    expect(within(nav).queryByRole('link', { name: /^settings$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^help$/i })).not.toBeInTheDocument()
    const settingsLinks = screen.getAllByRole('link', { name: /^settings$/i })
    expect(settingsLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('does not show generation counter in sidebar', () => {
    renderShell()
    expect(screen.queryByText(/generations/)).not.toBeInTheDocument()
  })

  it('logout button is inside the teacher profile card and calls logout', async () => {
    const user = userEvent.setup()
    renderShell()
    const card = screen.getAllByTestId('teacher-profile-card')[0]
    expect(card).toBeInTheDocument()
    const logoutBtn = within(card).getByRole('button', { name: /log out/i })
    expect(logoutBtn).toBeInTheDocument()
    await user.click(logoutBtn)
    expect(mockLogout).toHaveBeenCalledWith({ logoutParams: { returnTo: window.location.origin } })
  })

  it('renders Sessions nav item linking to /sessions', () => {
    renderShell()
    const sessionsLinks = screen.getAllByRole('link', { name: /^sessions$/i })
    expect(sessionsLinks.length).toBeGreaterThanOrEqual(1)
    expect(sessionsLinks[0]).toHaveAttribute('href', '/sessions')
  })

  it('does not render a My Profile nav item', () => {
    renderShell()
    expect(screen.queryByText('My Profile')).not.toBeInTheDocument()
  })

  it('active nav item has left-border indicator and no background fill', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/sessions']}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>
    )
    const sessionsLinks = screen.getAllByRole('link', { name: /^sessions$/i })
    const activeLink = sessionsLinks[0]
    expect(activeLink.className).toContain('border-l-primary')
    expect(activeLink.className).not.toContain('bg-white')
    expect(activeLink.className).not.toContain('bg-indigo')
  })

  it('sidebar renders the same nav items regardless of route', () => {
    const routes = ['/', '/sessions', '/settings']
    const expectedLabels = ['Dashboard', 'Students', 'Sessions', 'Courses', 'Settings']

    for (const route of routes) {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>
            <AppShell />
          </MemoryRouter>
        </QueryClientProvider>
      )
      const links = document.querySelector('aside')?.querySelectorAll('a')
      const labels = Array.from(links ?? []).map(a => a.textContent?.trim())
      expect(labels).toEqual(expectedLabels)
      unmount()
    }
  })

  it('renders LANGUAGE CURATOR subtitle below logo', () => {
    renderShell()
    const subtitles = screen.getAllByText(/language curator/i)
    expect(subtitles.length).toBeGreaterThanOrEqual(1)
  })

  it('renders Teacher label in user card', () => {
    renderShell()
    const teacherLabels = screen.getAllByText(/^teacher$/i)
    expect(teacherLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the mobile top bar with logo text', () => {
    renderShell()
    const logoTexts = screen.getAllByText('Atelier')
    // At least one in mobile top bar and one in desktop sidebar
    expect(logoTexts.length).toBeGreaterThanOrEqual(2)
  })

  it('shows Sessions as active nav when on session edit page reached from sessions list', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/students/1/sessions/2/edit', state: { from: 'sessions' } }]}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>
    )
    const sessionsLinks = screen.getAllByRole('link', { name: /^sessions$/i })
    expect(sessionsLinks[0].className).toContain('border-l-primary')
    const studentsLinks = screen.getAllByRole('link', { name: /^students$/i })
    expect(studentsLinks[0].className).not.toContain('border-l-primary')
  })

  it('shows Students as active nav when on session edit page reached from student detail', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/students/1/sessions/2/edit' }]}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>
    )
    const studentsLinks = screen.getAllByRole('link', { name: /^students$/i })
    expect(studentsLinks[0].className).toContain('border-l-primary')
    const sessionsLinks = screen.getAllByRole('link', { name: /^sessions$/i })
    expect(sessionsLinks[0].className).not.toContain('border-l-primary')
  })

  it('renders the Open Assistant FAB at canvas level (not in sidebar)', () => {
    renderShell()
    const btn = document.querySelector('[data-testid="open-assistant-btn"]')
    expect(btn).toBeInTheDocument()
    const aside = document.querySelector('aside')
    expect(aside?.querySelector('[data-testid="open-assistant-btn"]')).not.toBeInTheDocument()
  })

  it('Open Assistant FAB is outside the main nav element', () => {
    renderShell()
    const nav = screen.getByRole('navigation')
    expect(within(nav).queryByTestId('open-assistant-btn')).not.toBeInTheDocument()
  })

  it('clicking Open Assistant opens the stub panel', async () => {
    const user = userEvent.setup()
    renderShell('/students/123')
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
    const btn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(btn)
    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()
  })

  it('closing the assistant panel removes it from the DOM', async () => {
    const user = userEvent.setup()
    renderShell('/students/123')
    const openBtn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(openBtn)
    const closeBtn = screen.getByRole('button', { name: /close assistant/i })
    await user.click(closeBtn)
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
  })

  it('renders the Open Assistant mobile button in the top bar', () => {
    renderShell()
    expect(screen.getByTestId('open-assistant-mobile-btn')).toBeInTheDocument()
  })

  it('Escape key closes the assistant panel', async () => {
    const user = userEvent.setup()
    renderShell('/students/123')
    const openBtn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(openBtn)
    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
  })

  it('Ctrl+K opens the assistant panel on an enabled route', async () => {
    const user = userEvent.setup()
    renderShell('/students/123')
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()
  })

  it('Ctrl+K does nothing on a disabled route', async () => {
    const user = userEvent.setup()
    renderShell('/')
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
  })

  it('panel is not shown on initial render of a disabled route (timing regression)', () => {
    renderShell('/')
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
    renderShell('/courses')
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
    renderShell('/lessons')
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
  })

  it('clicking desktop FAB on / does not open panel (regression of #1051)', async () => {
    const user = userEvent.setup()
    renderShell('/')
    const btn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    await user.click(btn)
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
  })

  it('launcher is disabled on /students/new (no student anchor yet)', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/students/new']}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>
    )
    const openBtn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    expect(openBtn).toHaveAttribute('aria-disabled', 'true')
    await user.click(openBtn)
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
    unmount()
  })

  it('Escape with pending proposals shows inline discard confirm instead of closing', async () => {
    const user = userEvent.setup()
    mockPropose.mockResolvedValueOnce({
      proposals: [{ id: 'p1', type: 'student', field: 'cefrLevel', label: 'CEFR Level', oldValue: 'A2', newValue: 'B1' }],
    })
    renderShell('/students/123')
    const openBtn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(openBtn)
    const input = screen.getByTestId('assistant-input')
    await user.type(input, 'Hoy hemos trabajado el subjuntivo')
    await user.click(screen.getByTestId('assistant-send-btn'))
    // Wait for the pending proposal card to appear
    await waitFor(() => expect(screen.getByTestId('proposals-list')).toBeInTheDocument())
    // Pending proposal exists — Escape should show confirm, not close
    await user.keyboard('{Escape}')
    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()
    expect(screen.getByTestId('discard-confirm')).toBeInTheDocument()
  })

  it('reopening the panel after close shows empty state (no stale transcription or proposals)', async () => {
    const user = userEvent.setup()
    mockPropose.mockResolvedValueOnce({
      proposals: [{ id: 'p1', type: 'student', field: 'cefrLevel', label: 'CEFR Level', oldValue: 'A2', newValue: 'B1' }],
    })
    renderShell('/students/123')
    const openBtn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement

    // Open and produce proposals
    await user.click(openBtn)
    const input = screen.getByTestId('assistant-input')
    await user.type(input, 'Hoy hemos trabajado el subjuntivo')
    await user.click(screen.getByTestId('assistant-send-btn'))
    await waitFor(() => expect(screen.getByTestId('proposals-list')).toBeInTheDocument())
    expect(screen.getByTestId('transcription-block')).toBeInTheDocument()

    // Close with no pending prompt (X button — no blocking work if proposals are in non-pending state)
    // Dismiss all to remove pending proposals, then close cleanly
    await user.click(screen.getByTestId('dismiss-all-btn'))
    await waitFor(() => expect(screen.queryByTestId('batch-actions')).not.toBeInTheDocument())
    const closeBtn = screen.getByRole('button', { name: /close assistant/i })
    await user.click(closeBtn)
    await waitFor(() => expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument())

    // Reopen — must show empty state, no stale content
    await user.click(openBtn)
    expect(screen.getByTestId('assistant-empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('transcription-block')).not.toBeInTheDocument()
    expect(screen.queryByTestId('proposals-list')).not.toBeInTheDocument()
  })

  it('reopening after applying all proposals shows empty state', async () => {
    const user = userEvent.setup()
    mockPropose.mockResolvedValueOnce({
      proposals: [{ id: 'p1', type: 'student', field: 'cefrLevel', label: 'CEFR Level', oldValue: 'A2', newValue: 'B1' }],
    })
    renderShell('/students/123')
    const openBtn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement

    // Open, submit, wait for proposal
    await user.click(openBtn)
    const input = screen.getByTestId('assistant-input')
    await user.type(input, 'Worked on grammar')
    await user.click(screen.getByTestId('assistant-send-btn'))
    await waitFor(() => expect(screen.getByTestId('proposals-list')).toBeInTheDocument())

    // Apply the proposal (no pending → close via onClose path)
    await user.click(screen.getByTestId('apply-btn-p1'))
    await waitFor(() => expect(screen.queryByTestId('batch-actions')).not.toBeInTheDocument())
    const closeBtn = screen.getByRole('button', { name: /close assistant/i })
    await user.click(closeBtn)
    await waitFor(() => expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument())

    // Reopen — must be empty
    await user.click(openBtn)
    expect(screen.getByTestId('assistant-empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('transcription-block')).not.toBeInTheDocument()
  })

  it('reopening after discarding pending proposals shows empty state', async () => {
    const user = userEvent.setup()
    mockPropose.mockResolvedValueOnce({
      proposals: [{ id: 'p1', type: 'student', field: 'cefrLevel', label: 'CEFR Level', oldValue: 'A2', newValue: 'B1' }],
    })
    renderShell('/students/123')
    const openBtn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement

    // Open, submit, wait for proposal
    await user.click(openBtn)
    const input = screen.getByTestId('assistant-input')
    await user.type(input, 'Worked on grammar')
    await user.click(screen.getByTestId('assistant-send-btn'))
    await waitFor(() => expect(screen.getByTestId('proposals-list')).toBeInTheDocument())

    // Close with pending proposal → discard confirm appears → confirm discard
    const closeBtn = screen.getByRole('button', { name: /close assistant/i })
    await user.click(closeBtn)
    expect(screen.getByTestId('discard-confirm')).toBeInTheDocument()
    await user.click(screen.getByTestId('discard-confirm-yes'))
    await waitFor(() => expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument())

    // Reopen — must be empty
    await user.click(openBtn)
    expect(screen.getByTestId('assistant-empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('transcription-block')).not.toBeInTheDocument()
  })

  it('Open Assistant FAB shows active state (dimmed) when panel is open', async () => {
    const user = userEvent.setup()
    renderShell('/students/123')
    const btn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(btn)
    expect(btn.className).toContain('brightness-75')
  })

  describe('launcher enabled/disabled by route', () => {
    const disabledRoutes = ['/', '/courses', '/courses/abc', '/lessons', '/lessons/abc', '/lessons/abc/study', '/sessions', '/settings']
    const enabledRoutes = ['/students', '/students/123', '/students/123/edit', '/students/123/log-session', '/students/123/sessions/456/edit']

    for (const route of disabledRoutes) {
      it(`launcher is disabled on ${route}`, () => {
        renderShell(route)
        const btn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
        expect(btn).toHaveAttribute('aria-disabled', 'true')
        expect(btn.className).toContain('opacity-50')
      })
    }

    for (const route of enabledRoutes) {
      it(`launcher is active on ${route}`, () => {
        renderShell(route)
        const btn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
        expect(btn).not.toHaveAttribute('aria-disabled')
        expect(btn.className).not.toContain('opacity-50')
      })
    }
  })

  it('panel auto-closes and resets when navigating from an enabled to a disabled route', async () => {
    const user = userEvent.setup()
    const { router } = renderShellWithRouter('/students/123')
    const openBtn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(openBtn)
    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()

    await act(async () => { await router.navigate('/') })

    await waitFor(() => expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument())
    // Navigating back to an enabled route and reopening shows clean state
    await act(async () => { await router.navigate('/students/123') })
    const reopenBtn = document.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(reopenBtn)
    expect(screen.getByTestId('assistant-empty-state')).toBeInTheDocument()
  })
})
