import { ClipboardList } from 'lucide-react'
import type { TeachingTodo } from '@/api/students'

interface Props {
  todos: TeachingTodo[]
}

function statusDot(status: string) {
  if (status === 'Pending') return 'bg-indigo-500'
  if (status === 'Covered') return 'bg-green-500'
  return 'bg-zinc-400'
}

export function TeachingTodosCard({ todos }: Props) {
  if (todos.length === 0) {
    return (
      <div className="py-6 text-center" data-testid="teaching-todos-empty">
        <ClipboardList className="h-6 w-6 text-zinc-300 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">No teaching todos yet</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2" data-testid="teaching-todos-list">
      {todos.map((todo) => {
        const isCovered = todo.status === 'Covered'
        const isDismissed = todo.status === 'Dismissed'
        return (
          <li key={todo.id} className="flex items-start gap-2.5" data-testid="teaching-todo-item">
            <span
              className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${statusDot(todo.status)}`}
              data-testid={`todo-status-${todo.status.toLowerCase()}`}
            />
            <span
              className={`text-sm ${
                isCovered ? 'line-through text-zinc-400' :
                isDismissed ? 'text-zinc-400' :
                'text-[#1A1B22]'
              }`}
            >
              {todo.text}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
