import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { LearningGoalTreeEditor } from './LearningGoalTreeEditor'
import type { LearningGoalItem } from '../../api/students'

function makeGoal(text: string, children: LearningGoalItem[] = []): LearningGoalItem {
  return { id: crypto.randomUUID(), text, children }
}

describe('LearningGoalTreeEditor', () => {
  it('renders existing goals', () => {
    const goals = [makeGoal('Travel'), makeGoal('Business')]
    render(<LearningGoalTreeEditor value={goals} onChange={vi.fn()} />)
    expect(screen.getByText('Travel')).toBeInTheDocument()
    expect(screen.getByText('Business')).toBeInTheDocument()
  })

  it('adds a top-level goal', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LearningGoalTreeEditor value={[]} onChange={onChange} />)

    await user.click(screen.getByTestId('learning-goal-add-btn'))
    await user.type(screen.getByTestId('learning-goal-top-input'), 'New goal')
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledOnce()
    const [newGoals] = onChange.mock.calls[0] as [LearningGoalItem[]]
    expect(newGoals).toHaveLength(1)
    expect(newGoals[0].text).toBe('New goal')
    expect(newGoals[0].children).toHaveLength(0)
  })

  it('deletes a top-level goal', async () => {
    const user = userEvent.setup()
    const goals = [makeGoal('To delete'), makeGoal('Keep')]
    const onChange = vi.fn()
    render(<LearningGoalTreeEditor value={goals} onChange={onChange} />)

    const deleteBtns = screen.getAllByTestId('learning-goal-delete-btn')
    await user.click(deleteBtns[0])

    expect(onChange).toHaveBeenCalledOnce()
    const [newGoals] = onChange.mock.calls[0] as [LearningGoalItem[]]
    expect(newGoals).toHaveLength(1)
    expect(newGoals[0].text).toBe('Keep')
  })

  it('edits a goal text inline', async () => {
    const user = userEvent.setup()
    const goals = [makeGoal('Old text')]
    const onChange = vi.fn()
    render(<LearningGoalTreeEditor value={goals} onChange={onChange} />)

    await user.click(screen.getByTestId('learning-goal-text'))
    const input = screen.getByTestId('learning-goal-edit-input')
    await user.clear(input)
    await user.type(input, 'New text')
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledOnce()
    const [newGoals] = onChange.mock.calls[0] as [LearningGoalItem[]]
    expect(newGoals[0].text).toBe('New text')
  })

  it('adds a sub-goal to a top-level goal', async () => {
    const user = userEvent.setup()
    const goals = [makeGoal('Parent')]
    const onChange = vi.fn()
    render(<LearningGoalTreeEditor value={goals} onChange={onChange} />)

    await user.click(screen.getByTestId('learning-goal-add-child-btn'))
    await user.type(screen.getByTestId('learning-goal-child-input'), 'Child goal')
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledOnce()
    const [newGoals] = onChange.mock.calls[0] as [LearningGoalItem[]]
    expect(newGoals[0].children).toHaveLength(1)
    expect(newGoals[0].children[0].text).toBe('Child goal')
  })

  it('deletes a sub-goal', async () => {
    const user = userEvent.setup()
    const child = makeGoal('Child')
    const goals = [makeGoal('Parent', [child])]
    const onChange = vi.fn()
    render(<LearningGoalTreeEditor value={goals} onChange={onChange} />)

    const childDeleteBtn = screen.getByTestId('learning-goal-child-item')
      .querySelector('[data-testid="learning-goal-delete-btn"]') as HTMLElement
    await user.click(childDeleteBtn)

    expect(onChange).toHaveBeenCalledOnce()
    const [newGoals] = onChange.mock.calls[0] as [LearningGoalItem[]]
    expect(newGoals[0].children).toHaveLength(0)
  })

  it('shows collapse button when goal has children and toggles expansion', async () => {
    const user = userEvent.setup()
    const goals = [makeGoal('Parent', [makeGoal('Child')])]
    render(<LearningGoalTreeEditor value={goals} onChange={vi.fn()} />)

    expect(screen.getByTestId('learning-goal-collapse-btn')).toBeInTheDocument()
    expect(screen.getByTestId('learning-goal-child-item')).toBeInTheDocument()

    await user.click(screen.getByTestId('learning-goal-collapse-btn'))
    expect(screen.queryByTestId('learning-goal-child-item')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('learning-goal-collapse-btn'))
    expect(screen.getByTestId('learning-goal-child-item')).toBeInTheDocument()
  })

  it('does not show add-child button on child goals (max 2 levels)', () => {
    const goals = [makeGoal('Parent', [makeGoal('Child')])]
    render(<LearningGoalTreeEditor value={goals} onChange={vi.fn()} />)

    const childItem = screen.getByTestId('learning-goal-child-item')
    expect(childItem.querySelector('[data-testid="learning-goal-add-child-btn"]')).toBeNull()
  })

  // AC5: root goals render inside styled card containers
  it('wraps each root goal in a card container', () => {
    const goals = [makeGoal('Travel'), makeGoal('Business')]
    render(<LearningGoalTreeEditor value={goals} onChange={vi.fn()} />)
    const cards = screen.getAllByTestId('learning-goal-card')
    expect(cards).toHaveLength(2)
  })
})
