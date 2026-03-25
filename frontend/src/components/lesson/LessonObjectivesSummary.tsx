import { BookOpen } from 'lucide-react'

interface LessonObjectivesSummaryProps {
  objectives: string | null
  studentName: string | null
}

interface ParsedObjective {
  label: string
  category: 'grammar' | 'communicative' | 'cefr' | 'vocab' | 'general'
}

const CATEGORY_STYLES: Record<ParsedObjective['category'], string> = {
  grammar: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  communicative: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  cefr: 'bg-amber-50 border-amber-200 text-amber-700',
  vocab: 'bg-orange-50 border-orange-200 text-orange-700',
  general: 'bg-zinc-100 border-zinc-200 text-zinc-600',
}

function categorize(text: string): ParsedObjective['category'] {
  const lower = text.toLowerCase()
  if (lower.startsWith('grammar:') || lower.startsWith('grammar ')) return 'grammar'
  if (lower.startsWith('communicative') || lower.startsWith('communication')) return 'communicative'
  if (lower.startsWith('cefr') || lower.startsWith('skill focus')) return 'cefr'
  if (lower.startsWith('vocab') || lower.startsWith('vocabulary')) return 'vocab'
  return 'general'
}

function parseObjectives(raw: string): ParsedObjective[] {
  return raw
    .split(/\.\s+/)
    .map(s => s.replace(/\.$/, '').trim())
    .filter(Boolean)
    .map(label => ({ label, category: categorize(label) }))
}

function buildSummary(objectives: ParsedObjective[], studentName: string | null): string {
  const topics = objectives.map(o => {
    const colonIdx = o.label.indexOf(':')
    return colonIdx > -1 ? o.label.slice(colonIdx + 1).trim() : o.label
  }).filter(Boolean)

  if (studentName && topics.length > 0) {
    const joined = topics.length <= 2
      ? topics.join(' and ')
      : topics.slice(0, -1).join(', ') + ', and ' + topics[topics.length - 1]
    return `Helps ${studentName} practice ${joined}`
  }

  return 'Lesson objectives'
}

export function LessonObjectivesSummary({ objectives, studentName }: LessonObjectivesSummaryProps) {
  if (!objectives?.trim()) return null

  const parsed = parseObjectives(objectives)
  if (parsed.length === 0) return null

  const summary = buildSummary(parsed, studentName)

  return (
    <div
      className="rounded-lg border border-zinc-200 bg-white px-4 py-3"
      data-testid="lesson-objectives-summary"
    >
      <div className="flex items-start gap-2">
        <BookOpen className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-zinc-600 mb-2" data-testid="objectives-summary-text">
            {summary}
          </p>
          <div className="flex flex-wrap gap-1.5" data-testid="objectives-pills">
            {parsed.map((obj) => (
              <span
                key={obj.label}
                className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[obj.category]}`}
              >
                {obj.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
