import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { LearningGoalItem } from '../../api/students'
import { newId } from '@/lib/newId'

interface Props {
  value: LearningGoalItem[]
  onChange: (goals: LearningGoalItem[]) => void
}

function newGoal(text: string): LearningGoalItem {
  return { id: newId(), text, children: [] }
}

interface GoalRowProps {
  goal: LearningGoalItem
  depth: number
  onUpdate: (updated: LearningGoalItem) => void
  onDelete: () => void
}

function GoalRow({ goal, depth, onUpdate, onDelete }: GoalRowProps) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(goal.text)
  const [addingChild, setAddingChild] = useState(false)
  const [childText, setChildText] = useState('')

  const canAddChild = depth === 0

  function commitEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== goal.text) {
      onUpdate({ ...goal, text: trimmed })
    } else {
      setEditText(goal.text)
    }
    setEditing(false)
  }

  function addChild() {
    const trimmed = childText.trim()
    if (!trimmed) return
    onUpdate({ ...goal, children: [...goal.children, newGoal(trimmed)] })
    setChildText('')
    setAddingChild(false)
  }

  function updateChild(index: number, updated: LearningGoalItem) {
    const children = [...goal.children]
    children[index] = updated
    onUpdate({ ...goal, children })
  }

  function deleteChild(index: number) {
    onUpdate({ ...goal, children: goal.children.filter((_, i) => i !== index) })
  }

  const indent = depth * 20

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1"
        style={{ paddingLeft: indent }}
        data-testid={depth === 0 ? 'learning-goal-item' : 'learning-goal-child-item'}
      >
        {canAddChild && goal.children.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-400 hover:text-zinc-600 shrink-0"
            data-testid="learning-goal-collapse-btn"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="h-3.5 w-3.5 shrink-0 flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          </span>
        )}

        {editing ? (
          <Input
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') { setEditText(goal.text); setEditing(false) }
            }}
            className="h-6 text-sm flex-1"
            data-testid="learning-goal-edit-input"
          />
        ) : (
          <span
            className="text-sm text-[#1A1B22] flex-1 cursor-pointer hover:text-indigo-600"
            onClick={() => setEditing(true)}
            data-testid="learning-goal-text"
          >
            {goal.text}
          </span>
        )}

        {canAddChild && (
          <button
            type="button"
            onClick={() => { setAddingChild(true); setExpanded(true) }}
            className="text-zinc-400 hover:text-indigo-600 shrink-0"
            title="Add sub-goal"
            data-testid="learning-goal-add-child-btn"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="text-zinc-400 hover:text-red-500 shrink-0"
          title="Delete"
          data-testid="learning-goal-delete-btn"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && goal.children.map((child, i) => (
        <GoalRow
          key={child.id}
          goal={child}
          depth={depth + 1}
          onUpdate={(updated) => updateChild(i, updated)}
          onDelete={() => deleteChild(i)}
        />
      ))}

      {addingChild && (
        <div className="flex items-center gap-1 py-1" style={{ paddingLeft: indent + 20 }}>
          <Input
            autoFocus
            value={childText}
            onChange={(e) => setChildText(e.target.value)}
            onBlur={() => { if (!childText.trim()) { setAddingChild(false) } else { addChild() } }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addChild()
              if (e.key === 'Escape') { setChildText(''); setAddingChild(false) }
            }}
            placeholder="Sub-goal text..."
            className="h-6 text-sm flex-1"
            data-testid="learning-goal-child-input"
          />
          <Button type="button" size="sm" variant="ghost" onClick={addChild} className="h-6 px-2 text-xs">Add</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setChildText(''); setAddingChild(false) }} className="h-6 px-2 text-xs">Cancel</Button>
        </div>
      )}
    </div>
  )
}

export function LearningGoalTreeEditor({ value, onChange }: Props) {
  const [addingTop, setAddingTop] = useState(false)
  const [topText, setTopText] = useState('')

  function addTopGoal() {
    const trimmed = topText.trim()
    if (!trimmed) return
    onChange([...value, newGoal(trimmed)])
    setTopText('')
    setAddingTop(false)
  }

  function updateGoal(index: number, updated: LearningGoalItem) {
    const next = [...value]
    next[index] = updated
    onChange(next)
  }

  function deleteGoal(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {value.map((goal, i) => (
        <div
          key={goal.id}
          className="bg-white rounded-lg border border-[#F4F2FD] p-3 space-y-1"
          data-testid="learning-goal-card"
        >
          <GoalRow
            goal={goal}
            depth={0}
            onUpdate={(updated) => updateGoal(i, updated)}
            onDelete={() => deleteGoal(i)}
          />
        </div>
      ))}

      {addingTop ? (
        <div className="flex items-center gap-1 py-1">
          <Input
            autoFocus
            value={topText}
            onChange={(e) => setTopText(e.target.value)}
            onBlur={() => { if (!topText.trim()) { setAddingTop(false) } else { addTopGoal() } }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTopGoal()
              if (e.key === 'Escape') { setTopText(''); setAddingTop(false) }
            }}
            placeholder="Goal text..."
            className="h-7 text-sm flex-1"
            data-testid="learning-goal-top-input"
          />
          <Button type="button" size="sm" variant="ghost" onClick={addTopGoal} className="h-7 px-2 text-xs">Add</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setTopText(''); setAddingTop(false) }} className="h-7 px-2 text-xs">Cancel</Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAddingTop(true)}
          className="h-7 text-xs text-zinc-500 hover:text-indigo-600 px-0"
          data-testid="learning-goal-add-btn"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add goal
        </Button>
      )}
    </div>
  )
}
