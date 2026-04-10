import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { FieldTooltip } from './FieldTooltip'

describe('FieldTooltip', () => {
  it('renders info icon for a known field', () => {
    render(<FieldTooltip fieldKey="cefrLevel" />)
    expect(screen.getByTestId('field-tooltip-cefrLevel')).toBeInTheDocument()
  })

  it('renders nothing for an unknown field', () => {
    const { container } = render(<FieldTooltip fieldKey="nonExistentField" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows tooltip text on hover', async () => {
    const user = userEvent.setup()
    render(<FieldTooltip fieldKey="cefrLevel" />)
    const trigger = screen.getByTestId('field-tooltip-cefrLevel')
    await user.hover(trigger)
    expect(await screen.findByTestId('field-tooltip-content-cefrLevel')).toHaveTextContent(
      /the level YOU believe/i
    )
  })
})
