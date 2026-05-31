import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PillTabs } from './PillTabs'

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'members', label: 'Members' },
  { key: 'sessions', label: 'Sessions', badge: true },
]

describe('PillTabs', () => {
  it('renders all tabs', () => {
    render(<PillTabs tabs={tabs} activeTab="overview" onTabChange={vi.fn()} />)
    expect(screen.getByTestId('tab-overview')).toBeInTheDocument()
    expect(screen.getByTestId('tab-members')).toBeInTheDocument()
    expect(screen.getByTestId('tab-sessions')).toBeInTheDocument()
  })

  it('applies bg-white to the selected tab', () => {
    render(<PillTabs tabs={tabs} activeTab="members" onTabChange={vi.fn()} />)
    expect(screen.getByTestId('tab-members').className).toContain('bg-white')
    expect(screen.getByTestId('tab-overview').className).not.toContain('bg-white')
  })

  it('applies box-shadow inline style to selected tab only', () => {
    render(<PillTabs tabs={tabs} activeTab="overview" onTabChange={vi.fn()} />)
    expect(screen.getByTestId('tab-overview')).toHaveStyle({ boxShadow: '0 1px 3px rgba(26, 27, 34, 0.08)' })
    expect(screen.getByTestId('tab-members')).not.toHaveStyle({ boxShadow: '0 1px 3px rgba(26, 27, 34, 0.08)' })
  })

  it('calls onTabChange with the clicked tab key', async () => {
    const onTabChange = vi.fn()
    render(<PillTabs tabs={tabs} activeTab="overview" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByTestId('tab-members'))
    expect(onTabChange).toHaveBeenCalledWith('members')
  })

  it('renders the badge dot when badge is true', () => {
    render(<PillTabs tabs={tabs} activeTab="overview" onTabChange={vi.fn()} />)
    const sessionBtn = screen.getByTestId('tab-sessions')
    expect(sessionBtn.querySelector('.bg-amber-500')).toBeInTheDocument()
  })

  it('does not render a badge dot when badge is false', () => {
    render(<PillTabs tabs={tabs} activeTab="overview" onTabChange={vi.fn()} />)
    const overviewBtn = screen.getByTestId('tab-overview')
    expect(overviewBtn.querySelector('.bg-amber-500')).toBeNull()
  })
})
