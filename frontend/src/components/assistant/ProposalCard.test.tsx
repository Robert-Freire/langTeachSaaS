import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import ProposalCard from './ProposalCard'
import type { ProposalWithStatus } from '@/hooks/useAtelierAssistant'

function makeProposal(overrides: Partial<ProposalWithStatus> = {}): ProposalWithStatus {
  return {
    id: 'p1',
    type: 'student',
    field: 'cefrLevel',
    label: 'CEFR Level',
    oldValue: 'A2',
    newValue: 'B1',
    status: 'proposed',
    undoVisible: false,
    ...overrides,
  }
}

function renderCard(proposal: ProposalWithStatus, handlers = {}) {
  const props = {
    onApply: vi.fn(),
    onDismiss: vi.fn(),
    onUndo: vi.fn(),
    onRetry: vi.fn(),
    onModify: vi.fn(),
    onEditPayload: vi.fn(),
    ...handlers,
  }
  return { ...render(<ProposalCard proposal={proposal} {...props} />), props }
}

describe('ProposalCard', () => {
  it('proposed: shows Apply and Dismiss buttons', () => {
    renderCard(makeProposal({ status: 'proposed' }))
    expect(screen.getByTestId('apply-btn-p1')).toBeInTheDocument()
    expect(screen.getByTestId('dismiss-btn-p1')).toBeInTheDocument()
  })

  it('proposed: shows diff with old and new value', () => {
    renderCard(makeProposal({ oldValue: 'A2', newValue: 'B1' }))
    expect(screen.getByText('A2')).toBeInTheDocument()
    expect(screen.getByText('B1')).toBeInTheDocument()
    expect(screen.getByText('A2').className).toContain('line-through')
  })

  it('proposed: shows only new value when no old value', () => {
    renderCard(makeProposal({ oldValue: null, newValue: 'Review passive voice' }))
    expect(screen.getByText('Review passive voice')).toBeInTheDocument()
    expect(screen.queryByText('→')).not.toBeInTheDocument()
  })

  it('proposed: calls onApply with id when Apply clicked', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    renderCard(makeProposal(), { onApply })
    await user.click(screen.getByTestId('apply-btn-p1'))
    expect(onApply).toHaveBeenCalledWith('p1')
  })

  it('proposed: calls onDismiss with id when Dismiss clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    renderCard(makeProposal(), { onDismiss })
    await user.click(screen.getByTestId('dismiss-btn-p1'))
    expect(onDismiss).toHaveBeenCalledWith('p1')
  })

  it('applied: shows Applied pill, no action buttons', () => {
    renderCard(makeProposal({ status: 'applied' }))
    expect(screen.getByText(/applied/i)).toBeInTheDocument()
    expect(screen.queryByTestId('apply-btn-p1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dismiss-btn-p1')).not.toBeInTheDocument()
  })

  it('dismissed: shows Dismissed pill and reduced opacity', () => {
    renderCard(makeProposal({ status: 'dismissed', undoVisible: false }))
    expect(screen.getByText(/dismissed/i)).toBeInTheDocument()
    expect(screen.getByTestId('proposal-card-p1').className).toContain('opacity-40')
  })

  it('dismissed: shows Undo button when undoVisible is true', () => {
    renderCard(makeProposal({ status: 'dismissed', undoVisible: true }))
    expect(screen.getByTestId('undo-btn-p1')).toBeInTheDocument()
  })

  it('dismissed: hides Undo button when undoVisible is false', () => {
    renderCard(makeProposal({ status: 'dismissed', undoVisible: false }))
    expect(screen.queryByTestId('undo-btn-p1')).not.toBeInTheDocument()
  })

  it('dismissed: calls onUndo with id when Undo clicked', async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    renderCard(makeProposal({ status: 'dismissed', undoVisible: true }), { onUndo })
    await user.click(screen.getByTestId('undo-btn-p1'))
    expect(onUndo).toHaveBeenCalledWith('p1')
  })

  it('error: shows Error pill, error message, Retry and Dismiss buttons', () => {
    renderCard(makeProposal({ status: 'error', errorMessage: 'Network error' }))
    expect(screen.getAllByText(/error/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Network error')).toBeInTheDocument()
    expect(screen.getByTestId('retry-btn-p1')).toBeInTheDocument()
  })

  it('error: calls onRetry with id when Retry clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderCard(makeProposal({ status: 'error' }), { onRetry })
    await user.click(screen.getByTestId('retry-btn-p1'))
    expect(onRetry).toHaveBeenCalledWith('p1')
  })

  it('session type: uses Calendar icon config (violet accent)', () => {
    const { container } = renderCard(makeProposal({ type: 'session' }))
    expect(container.querySelector('.bg-violet-500')).toBeInTheDocument()
  })

  it('todo type: uses CheckSquare icon config (emerald accent)', () => {
    const { container } = renderCard(makeProposal({ type: 'todo', oldValue: null, newValue: 'Review passive voice' }))
    expect(container.querySelector('.bg-emerald-500')).toBeInTheDocument()
  })

  it('todo type: shows editable date chip when payload has dueDate', async () => {
    const onEditPayload = vi.fn()
    renderCard(
      makeProposal({ type: 'todo', oldValue: null, newValue: 'Repasar la voz pasiva', payload: { dueDate: '2026-05-12' } }),
      { onEditPayload }
    )
    const dateInput = screen.getByTestId('todo-date-input-p1') as HTMLInputElement
    expect(dateInput).toBeInTheDocument()
    expect(dateInput.value).toBe('2026-05-12')
    fireEvent.change(dateInput, { target: { value: '2026-05-19' } })
    expect(onEditPayload).toHaveBeenCalledWith('p1', { dueDate: '2026-05-19' })
  })

  it('todo type: shows empty date chip when payload has no dueDate', () => {
    renderCard(makeProposal({ type: 'todo', oldValue: null, newValue: 'Repasar la voz pasiva', payload: { dueDate: null } }))
    const dateInput = screen.getByTestId('todo-date-input-p1') as HTMLInputElement
    expect(dateInput.value).toBe('')
  })

  it('todo type: date chip is disabled when card is applied', () => {
    renderCard(makeProposal({ type: 'todo', oldValue: null, newValue: 'Repasar la voz pasiva', status: 'applied', payload: { dueDate: '2026-05-12' } }))
    const dateInput = screen.getByTestId('todo-date-input-p1') as HTMLInputElement
    expect(dateInput).toBeDisabled()
  })

  it('proposed: shows Modify button', () => {
    renderCard(makeProposal({ status: 'proposed' }))
    expect(screen.getByTestId('modify-btn-p1')).toBeInTheDocument()
  })

  it('applied: does not show Modify button', () => {
    renderCard(makeProposal({ status: 'applied' }))
    expect(screen.queryByTestId('modify-btn-p1')).not.toBeInTheDocument()
  })

  it('dismissed: does not show Modify button', () => {
    renderCard(makeProposal({ status: 'dismissed', undoVisible: false }))
    expect(screen.queryByTestId('modify-btn-p1')).not.toBeInTheDocument()
  })

  it('clicking Modify shows inline input with current value', async () => {
    const user = userEvent.setup()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }))
    await user.click(screen.getByTestId('modify-btn-p1'))
    const input = screen.getByTestId('modify-input-p1') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('B1')
  })

  it('Enter in inline input commits and calls onModify', async () => {
    const user = userEvent.setup()
    const onModify = vi.fn()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }), { onModify })
    await user.click(screen.getByTestId('modify-btn-p1'))
    const input = screen.getByTestId('modify-input-p1')
    await user.clear(input)
    await user.type(input, 'B2')
    await user.keyboard('{Enter}')
    expect(onModify).toHaveBeenCalledWith('p1', 'B2')
    expect(screen.queryByTestId('modify-input-p1')).not.toBeInTheDocument()
  })

  it('Escape in inline input cancels without calling onModify', async () => {
    const user = userEvent.setup()
    const onModify = vi.fn()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }), { onModify })
    await user.click(screen.getByTestId('modify-btn-p1'))
    await user.type(screen.getByTestId('modify-input-p1'), 'B2')
    await user.keyboard('{Escape}')
    expect(onModify).not.toHaveBeenCalled()
    expect(screen.queryByTestId('modify-input-p1')).not.toBeInTheDocument()
  })

  it('Save button commits and calls onModify', async () => {
    const user = userEvent.setup()
    const onModify = vi.fn()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }), { onModify })
    await user.click(screen.getByTestId('modify-btn-p1'))
    const input = screen.getByTestId('modify-input-p1')
    await user.clear(input)
    await user.type(input, 'B2')
    await user.click(screen.getByTestId('modify-save-btn-p1'))
    expect(onModify).toHaveBeenCalledWith('p1', 'B2')
  })

  it('Cancel button exits edit mode without calling onModify', async () => {
    const user = userEvent.setup()
    const onModify = vi.fn()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }), { onModify })
    await user.click(screen.getByTestId('modify-btn-p1'))
    await user.click(screen.getByTestId('modify-cancel-btn-p1'))
    expect(onModify).not.toHaveBeenCalled()
    expect(screen.queryByTestId('modify-input-p1')).not.toBeInTheDocument()
  })

  it('empty value on Enter does not call onModify', async () => {
    const user = userEvent.setup()
    const onModify = vi.fn()
    renderCard(makeProposal({ status: 'proposed', newValue: 'B1' }), { onModify })
    await user.click(screen.getByTestId('modify-btn-p1'))
    const input = screen.getByTestId('modify-input-p1')
    await user.clear(input)
    await user.keyboard('{Enter}')
    expect(onModify).not.toHaveBeenCalled()
  })

  it('newStudent type: uses teal accent', () => {
    const { container } = renderCard(makeProposal({
      type: 'newStudent', field: 'profile', label: 'New Student', oldValue: null, newValue: 'Sofía',
      newStudentPayload: { name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' },
    }))
    expect(container.querySelector('.bg-teal-500')).toBeInTheDocument()
  })

  it('newStudent type: renders inline field inputs instead of diff', () => {
    renderCard(makeProposal({
      type: 'newStudent', field: 'profile', label: 'New Student', oldValue: null, newValue: 'Sofía',
      newStudentPayload: { name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' },
    }))
    expect(screen.getByDisplayValue('Sofía')).toBeInTheDocument()
    expect(screen.getByDisplayValue('inglés')).toBeInTheDocument()
  })

  it('newStudent type: does not show Modify button', () => {
    renderCard(makeProposal({
      type: 'newStudent', field: 'profile', label: 'New Student', oldValue: null, newValue: 'Sofía',
      newStudentPayload: { name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' },
    }))
    expect(screen.queryByTestId('modify-btn-p1')).not.toBeInTheDocument()
  })

  it('newStudent type: calls onEditPayload when a field is changed', async () => {
    const user = userEvent.setup()
    const onEditPayload = vi.fn()
    renderCard(
      makeProposal({
        type: 'newStudent', field: 'profile', label: 'New Student', oldValue: null, newValue: 'Sofía',
        newStudentPayload: { name: 'Sofía', learningLanguage: 'inglés', cefrLevel: 'B1' },
      }),
      { onEditPayload },
    )
    const nameInput = screen.getByDisplayValue('Sofía')
    await user.type(nameInput, 'X')
    expect(onEditPayload).toHaveBeenCalled()
    const lastCall = onEditPayload.mock.calls[onEditPayload.mock.calls.length - 1]
    expect(lastCall[0]).toBe('p1')
    expect(lastCall[1].name).toBe('SofíaX')
  })

  it('newSession type: uses amber accent', () => {
    const { container } = renderCard(makeProposal({
      type: 'newSession', field: 'newSession', label: 'New Session', oldValue: null, newValue: 'Subjunctive',
      payload: { title: 'Subjunctive', sessionDate: '2026-05-12' },
    }))
    expect(container.querySelector('.bg-amber-500')).toBeInTheDocument()
  })

  it('newSession type: shows title and date chip', () => {
    renderCard(makeProposal({
      type: 'newSession', field: 'newSession', label: 'New Session', oldValue: null, newValue: 'Subjunctive',
      payload: { title: 'Subjunctive', sessionDate: '2026-05-12' },
    }))
    expect(screen.getByText('Subjunctive')).toBeInTheDocument()
    expect(screen.getByTestId('session-date-input-p1')).toBeInTheDocument()
    expect(screen.getByTestId('session-date-input-p1')).toHaveValue('2026-05-12')
  })

  it('newSession type: does not show Modify button', () => {
    renderCard(makeProposal({
      type: 'newSession', field: 'newSession', label: 'New Session', oldValue: null, newValue: 'Subjunctive',
      payload: { title: 'Subjunctive', sessionDate: '2026-05-12' },
    }))
    expect(screen.queryByTestId('modify-btn-p1')).not.toBeInTheDocument()
  })

  it('newSession type: Apply is enabled when studentId is provided', () => {
    const { props } = renderCard(
      makeProposal({
        type: 'newSession', field: 'newSession', label: 'New Session', oldValue: null, newValue: 'Subjunctive',
        payload: { title: 'Subjunctive', sessionDate: '2026-05-12' },
      }),
      { studentId: 'student-123' },
    )
    const applyBtn = screen.getByTestId('apply-btn-p1')
    expect(applyBtn).not.toBeDisabled()
    applyBtn.click()
    expect(props.onApply).toHaveBeenCalledWith('p1')
  })

  it('newSession type: Apply is disabled and shows message when no studentId', () => {
    renderCard(makeProposal({
      type: 'newSession', field: 'newSession', label: 'New Session', oldValue: null, newValue: 'Subjunctive',
      payload: { title: 'Subjunctive', sessionDate: '2026-05-12' },
    }))
    const applyBtn = screen.getByTestId('apply-btn-p1')
    expect(applyBtn).toBeDisabled()
    expect(screen.getByText(/Open from a student's screen/)).toBeInTheDocument()
  })

  it('newSession type: calls onEditPayload when date chip changes', () => {
    const onEditPayload = vi.fn()
    renderCard(
      makeProposal({
        type: 'newSession', field: 'newSession', label: 'New Session', oldValue: null, newValue: 'Subjunctive',
        payload: { title: 'Subjunctive', sessionDate: '2026-05-12' },
      }),
      { onEditPayload, studentId: 'student-123' },
    )
    const dateInput = screen.getByTestId('session-date-input-p1')
    fireEvent.change(dateInput, { target: { value: '2026-05-19' } })
    expect(onEditPayload).toHaveBeenCalled()
    const lastCall = onEditPayload.mock.calls[onEditPayload.mock.calls.length - 1]
    expect(lastCall[0]).toBe('p1')
    expect(lastCall[1].sessionDate).toBe('2026-05-19')
    expect(lastCall[1].title).toBe('Subjunctive')
  })
})
