/* eslint-disable react-refresh/only-export-components */
import { isHomeworkContent } from '../../../types/contentTypes'
import type { HomeworkTask } from '../../../types/contentTypes'
import type { EditorProps, PreviewProps, StudentProps } from '../contentRegistry'
import { ContentParseError } from '../ContentParseError'

const inputClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200'
const textareaClass = 'w-full bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-zinc-200 resize-none'

function normalizeTask(task: unknown): HomeworkTask {
  const t = (typeof task === 'object' && task !== null ? task : {}) as Partial<HomeworkTask>
  return {
    type: typeof t.type === 'string' ? t.type : '',
    instructions: typeof t.instructions === 'string' ? t.instructions : '',
    examples: Array.isArray(t.examples)
      ? t.examples.filter((ex): ex is string => typeof ex === 'string')
      : [],
  }
}

function Editor({ parsedContent, rawContent, onChange }: EditorProps) {
  if (!isHomeworkContent(parsedContent)) {
    return (
      <textarea
        value={rawContent}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full resize-none text-sm border rounded p-2"
      />
    )
  }

  const tasks = parsedContent.tasks.map(normalizeTask)
  const emit = (newTasks: HomeworkTask[]) => onChange(JSON.stringify({ tasks: newTasks }))

  const handleTaskChange = (index: number, field: keyof HomeworkTask, value: string | string[]) => {
    const newTasks = tasks.map((t, i) => i === index ? { ...t, [field]: value } : t)
    emit(newTasks)
  }

  const handleExampleChange = (taskIndex: number, exIndex: number, value: string) => {
    const newExamples = (tasks[taskIndex]?.examples ?? []).map((ex, i) => i === exIndex ? value : ex)
    handleTaskChange(taskIndex, 'examples', newExamples)
  }

  const handleAddExample = (taskIndex: number) => {
    const newExamples = [...(tasks[taskIndex]?.examples ?? []), '']
    handleTaskChange(taskIndex, 'examples', newExamples)
  }

  const handleRemoveExample = (taskIndex: number, exIndex: number) => {
    const newExamples = (tasks[taskIndex]?.examples ?? []).filter((_, i) => i !== exIndex)
    handleTaskChange(taskIndex, 'examples', newExamples)
  }

  const handleAddTask = () => {
    emit([...tasks, { type: '', instructions: '', examples: [''] }])
  }

  const handleRemoveTask = (index: number) => {
    emit(tasks.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4" data-testid="homework-editor">
      {tasks.map((task, ti) => (
        <div key={ti} className="border border-zinc-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={task.type}
              onChange={(e) => handleTaskChange(ti, 'type', e.target.value)}
              placeholder="Task type (e.g. Vocabulary in Context)"
              className={inputClass}
              data-testid={`homework-task-type-${ti}`}
            />
            <button
              type="button"
              onClick={() => handleRemoveTask(ti)}
              className="text-zinc-400 hover:text-red-500 transition-colors px-1 shrink-0"
              aria-label="Remove task"
              data-testid={`homework-remove-task-${ti}`}
            >
              ✕
            </button>
          </div>
          <textarea
            value={task.instructions}
            onChange={(e) => handleTaskChange(ti, 'instructions', e.target.value)}
            placeholder="Instructions"
            rows={3}
            className={textareaClass}
            data-testid={`homework-task-instructions-${ti}`}
          />
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Examples</label>
            {task.examples.map((ex, ei) => (
              <div key={ei} className="flex gap-2 items-center">
                <input
                  value={ex}
                  onChange={(e) => handleExampleChange(ti, ei, e.target.value)}
                  placeholder={`Example ${ei + 1}`}
                  className={inputClass}
                  data-testid={`homework-task-${ti}-example-${ei}`}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveExample(ti, ei)}
                  className="text-zinc-400 hover:text-red-500 transition-colors px-1 shrink-0"
                  aria-label="Remove example"
                  data-testid={`homework-remove-example-${ti}-${ei}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleAddExample(ti)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              data-testid={`homework-add-example-${ti}`}
            >
              + Add example
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddTask}
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        data-testid="homework-add-task"
      >
        + Add task
      </button>
    </div>
  )
}

function Preview({ parsedContent }: PreviewProps) {
  if (!isHomeworkContent(parsedContent)) {
    return <ContentParseError context="teacher" />
  }

  const tasks = parsedContent.tasks.map(normalizeTask)

  return (
    <div className="space-y-4" data-testid="homework-preview">
      {tasks.map((task, i) => (
        <div key={i} className="border border-zinc-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {task.type}
            </span>
            <span className="text-xs text-zinc-400">Task {i + 1}</span>
          </div>
          <p className="text-sm text-zinc-700">{task.instructions}</p>
          {task.examples.length > 0 && (
            <ul className="list-disc list-inside space-y-1">
              {task.examples.map((ex, ei) => (
                <li key={ei} className="text-sm text-zinc-600 italic">{ex}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

function Student({ parsedContent }: StudentProps) {
  if (!isHomeworkContent(parsedContent)) {
    return <ContentParseError context="student" />
  }

  const tasks = parsedContent.tasks.map(normalizeTask)

  return (
    <div className="space-y-4" data-testid="homework-student">
      {tasks.map((task, i) => (
        <div key={i} className="border border-zinc-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-700">Task {i + 1}:</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {task.type}
            </span>
          </div>
          <p className="text-sm text-zinc-700">{task.instructions}</p>
          {task.examples.length > 0 && (
            <ol className="list-decimal list-inside space-y-1">
              {task.examples.map((ex, ei) => (
                <li key={ei} className="text-sm text-zinc-600 italic">{ex}</li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  )
}

export const HomeworkRenderer = { Editor, Preview, Student }
