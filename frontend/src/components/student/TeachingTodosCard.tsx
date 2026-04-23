import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Plus, Trash2, Check } from 'lucide-react'
import type { TeachingTodo } from '@/api/students'
import { appendTeachingTodo, updateTeachingTodo, deleteTeachingTodo } from '@/api/students'

interface TeachingTodosCardProps {
  todos: TeachingTodo[]
  studentId: string
  onStudentChange: () => void
  allowEdit?: boolean
  /** Controlled mode: when provided, the add input row is shown only when true */
  showAddForm?: boolean
  /** Called after a successful add or when the user dismisses the input (controlled mode only) */
  onAddFormClose?: () => void
}

const COMPLETED_STATUSES = new Set(['done', 'covered', 'dismissed'])

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function sortTodos(todos: TeachingTodo[]): TeachingTodo[] {
  return [...todos].sort((a, b) => {
    const priority = (s: string) => (s === 'pending' ? 0 : 1)
    const p = priority(a.status) - priority(b.status)
    if (p !== 0) return p
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

interface OptimisticAdd extends TeachingTodo { _temp: true }
interface PendingUpdate { status?: string; text?: string }

export function TeachingTodosCard({ todos, studentId, onStudentChange, allowEdit = false, showAddForm, onAddFormClose }: TeachingTodosCardProps) {
  const isControlled = showAddForm !== undefined
  // Optimistic state: overlays on top of the server-provided `todos` prop
  const [optimisticAdds, setOptimisticAdds] = useState<OptimisticAdd[]>([])
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, PendingUpdate>>(() => new Map())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())
  const [showCompleted, setShowCompleted] = useState(false)

  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Derive all merged todos from server state + optimistic overlays
  const allMergedTodos = useMemo(() => {
    const serverMerged = todos
      .filter(t => !deletedIds.has(t.id))
      .map(t => {
        const pending = pendingUpdates.get(t.id)
        return pending ? { ...t, ...pending } : t
      })
    return sortTodos([...serverMerged, ...optimisticAdds])
  }, [todos, deletedIds, pendingUpdates, optimisticAdds])

  const completedCount = useMemo(
    () => allMergedTodos.filter(t => COMPLETED_STATUSES.has(t.status)).length,
    [allMergedTodos]
  )

  const displayedTodos = useMemo(
    () => showCompleted ? allMergedTodos : allMergedTodos.filter(t => !COMPLETED_STATUSES.has(t.status)),
    [allMergedTodos, showCompleted]
  )

  const addMutation = useMutation({
    mutationFn: (text: string) => appendTeachingTodo(studentId, text),
    onMutate: (text) => {
      const tempId = `temp-${Date.now()}`
      const temp: OptimisticAdd = {
        _temp: true,
        id: tempId,
        text,
        status: 'pending',
        createdAt: new Date().toISOString(),
        sourceSessionLogId: null,
        coveredInSessionLogId: null,
      }
      setOptimisticAdds(prev => [...prev, temp])
      return { tempId }
    },
    onSuccess: (_, __, context) => {
      setOptimisticAdds(prev => prev.filter(t => t.id !== context?.tempId))
      onStudentChange()
      if (isControlled) onAddFormClose?.()
    },
    onError: (_, __, context) => {
      setOptimisticAdds(prev => prev.filter(t => t.id !== context?.tempId))
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ todoId, status }: { todoId: string; status: string }) =>
      updateTeachingTodo(studentId, todoId, { status }),
    onMutate: ({ todoId, status }) => {
      setPendingUpdates(prev => new Map(prev).set(todoId, { ...prev.get(todoId), status }))
    },
    onSuccess: (_, { todoId }) => {
      setPendingUpdates(prev => { const m = new Map(prev); m.delete(todoId); return m })
      onStudentChange()
    },
    onError: (_, { todoId }) => {
      setPendingUpdates(prev => { const m = new Map(prev); m.delete(todoId); return m })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (todoId: string) => deleteTeachingTodo(studentId, todoId),
    onMutate: (todoId) => {
      setDeletedIds(prev => new Set([...prev, todoId]))
    },
    onSuccess: (_, todoId) => {
      setDeletedIds(prev => { const s = new Set(prev); s.delete(todoId); return s })
      onStudentChange()
    },
    onError: (_, todoId) => {
      setDeletedIds(prev => { const s = new Set(prev); s.delete(todoId); return s })
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ todoId, text, status }: { todoId: string; text: string; status: string }) =>
      updateTeachingTodo(studentId, todoId, { status, text }),
    onMutate: ({ todoId, text }) => {
      setPendingUpdates(prev => new Map(prev).set(todoId, { ...prev.get(todoId), text }))
    },
    onSuccess: (_, { todoId }) => {
      setPendingUpdates(prev => { const m = new Map(prev); m.delete(todoId); return m })
      onStudentChange()
    },
    onError: (_, { todoId }) => {
      setPendingUpdates(prev => { const m = new Map(prev); m.delete(todoId); return m })
    },
  })

  function handleAdd() {
    const text = newText.trim()
    if (!text || addMutation.isPending) return
    setNewText('')
    addMutation.mutate(text)
  }

  function handleToggle(todo: TeachingTodo) {
    if (toggleMutation.isPending) return
    const next = todo.status === 'pending' ? 'done' : 'pending'
    toggleMutation.mutate({ todoId: todo.id, status: next })
  }

  function startEdit(todo: TeachingTodo) {
    setEditingId(todo.id)
    setEditText(todo.text)
  }

  function commitEdit(todoId: string, currentStatus: string) {
    const text = editText.trim()
    setEditingId(null)
    const originalTodo = todos.find(t => t.id === todoId) ?? allMergedTodos.find(t => t.id === todoId)
    if (text && text !== originalTodo?.text) {
      editMutation.mutate({ todoId, text, status: currentStatus })
    }
  }

  return (
    <div data-testid="teaching-todos-card">
      {allMergedTodos.length === 0 ? (
        <p className="text-sm text-zinc-400 italic mb-3" data-testid="teaching-todos-empty">
          No ideas yet. Add one below.
        </p>
      ) : (
        <>
          {displayedTodos.length > 0 && (
            <ul className="space-y-2 mb-3" data-testid="teaching-todos-list">
              {displayedTodos.map((todo) => {
                const isDone = todo.status === 'done'
                const isCovered = todo.status === 'covered'
                const isDismissed = todo.status === 'dismissed'
                const isCompleted = isDone || isCovered || isDismissed
                const isEditing = editingId === todo.id
                const isOptimistic = '_temp' in todo

                return (
                  <li
                    key={todo.id}
                    className="flex items-start gap-2 group"
                    data-testid="teaching-todo-item"
                  >
                    {/* Checkbox / status toggle */}
                    <button
                      type="button"
                      onClick={() => !isOptimistic && handleToggle(todo)}
                      aria-label={isCompleted ? 'Mark pending' : 'Mark done'}
                      data-testid={`todo-toggle-${todo.id}`}
                      className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-green-500 border-green-500'
                          : 'border-indigo-400 hover:border-indigo-600'
                      }`}
                    >
                      {isCompleted && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </button>

                    {/* Text / edit */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onBlur={() => commitEdit(todo.id, todo.status)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(todo.id, todo.status)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          maxLength={500}
                          className="w-full text-sm border-b border-indigo-300 bg-transparent outline-none text-[#1A1B22] py-0.5"
                          data-testid={`todo-edit-input-${todo.id}`}
                        />
                      ) : (
                        <span
                          className={`text-sm leading-snug ${
                            isCompleted ? 'line-through text-zinc-400' : 'text-[#1A1B22]'
                          } ${allowEdit && !isOptimistic ? 'cursor-text hover:text-indigo-700' : ''}`}
                          onClick={() => allowEdit && !isOptimistic && startEdit(todo)}
                          data-testid={`todo-text-${todo.id}`}
                        >
                          {todo.text}
                        </span>
                      )}
                      <span className="block text-[0.6875rem] text-zinc-400 mt-0.5" data-testid={`todo-time-${todo.id}`}>
                        {relativeTime(todo.createdAt)}
                      </span>
                    </div>

                    {/* Delete button (allowEdit only, not for provisional optimistic items) */}
                    {allowEdit && !isEditing && !isOptimistic && (
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(todo.id)}
                        aria-label="Delete todo"
                        data-testid={`todo-delete-${todo.id}`}
                        className="shrink-0 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 mt-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {completedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowCompleted(v => !v)}
              data-testid="todo-show-completed-toggle"
              className="mb-3 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {showCompleted ? `Hide completed (${completedCount})` : `Show ${completedCount} completed`}
            </button>
          )}
        </>
      )}

      {/* Add input — always visible in uncontrolled mode; visible only when showAddForm=true in controlled mode */}
      {(!isControlled || showAddForm) && (
        <div className="flex gap-2" data-testid="todo-add-row">
          <input
            autoFocus={isControlled}
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape' && isControlled) { setNewText(''); onAddFormClose?.() }
            }}
            onBlur={() => {
              if (isControlled && !newText.trim()) onAddFormClose?.()
            }}
            placeholder="Add a teaching idea..."
            maxLength={500}
            className="flex-1 rounded-lg border border-zinc-200 bg-indigo-50 px-3 py-1.5 text-sm text-[#1A1B22] placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            data-testid="todo-add-input"
            disabled={addMutation.isPending}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={addMutation.isPending || !newText.trim()}
            data-testid="todo-add-btn"
            aria-label="Add todo"
            className="shrink-0 rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
