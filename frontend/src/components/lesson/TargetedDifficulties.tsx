import type { TargetedDifficulty } from '../../api/generate'

const SEVERITY_CLASSES: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
}

interface TargetedDifficultiesProps {
  generationParams?: string | null
  difficulties?: TargetedDifficulty[]
}

function extractDifficulties(props: TargetedDifficultiesProps): TargetedDifficulty[] {
  if (props.difficulties && props.difficulties.length > 0) {
    return props.difficulties
  }
  if (!props.generationParams) return []
  try {
    const parsed = JSON.parse(props.generationParams)
    const arr = parsed.targetedDifficulties
    if (Array.isArray(arr) && arr.length > 0) return arr
  } catch { /* ignore */ }
  return []
}

export function TargetedDifficulties(props: TargetedDifficultiesProps) {
  const difficulties = extractDifficulties(props)
  if (difficulties.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1" data-testid="targeted-difficulties">
      {difficulties.map((d, i) => {
        // Support legacy blocks that used {category, item} before the taxonomy rename.
        const competency = d.competency ?? (d as unknown as { category?: string }).category ?? ''
        const description = d.description ?? (d as unknown as { item?: string }).item ?? ''
        return (
          <span
            key={`${competency}-${description}-${i}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${SEVERITY_CLASSES[d.severity] ?? SEVERITY_CLASSES.low}`}
            data-testid="difficulty-badge"
          >
            <span className="font-medium">[{competency}]</span>
            {description}
          </span>
        )
      })}
    </div>
  )
}
