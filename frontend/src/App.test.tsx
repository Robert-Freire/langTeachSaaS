import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Dashboard from './pages/Dashboard'
import { MemoryRouter } from 'react-router-dom'

describe('Dashboard', () => {
  it('renders the dashboard heading', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
