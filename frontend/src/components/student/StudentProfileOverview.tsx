import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { cn } from '@/lib/utils'
import type { Student } from '@/api/students'
import { parseNotes, isSentinel } from './studentNoteUtils'
import { langCode } from './langUtils'

const SKILL_ORDER = ['Reading', 'Writing', 'Speaking', 'Listening']
const CEFR_WIDTH: Record<string, string> = {
  A1: 'w-1/6', A2: 'w-2/6', B1: 'w-3/6', B2: 'w-4/6', C1: 'w-5/6', C2: 'w-full',
}

interface Props {
  student: Student
  onToggleDifficultyStatus?: (id: string, status: 'Active' | 'Covered') => void
}

function ChipList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return <span className="text-sm text-zinc-400 italic">{emptyText}</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="text-xs text-zinc-600 border-zinc-200">
          {item}
        </Badge>
      ))}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function StudentProfileOverview({ student, onToggleDifficultyStatus }: Props) {
  const parsedPersonalNotes = parseNotes(isSentinel(student.personalNotes) ? null : student.personalNotes)
  const parsedTeachingNotes = parseNotes(student.teachingNotes)

  return (
    <Card data-testid="student-profile-overview">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pedagogical Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-4">
          {/* Skill bars */}
          {SKILL_ORDER.some((s) => student.skillLevelOverrides?.[s]) && (
            <FieldRow label="Skill overrides">
              <div className="space-y-2" data-testid="overview-skill-bars">
                {SKILL_ORDER.filter((s) => student.skillLevelOverrides?.[s]).map((skill) => {
                  const level = student.skillLevelOverrides[skill]
                  return (
                    <div key={skill} className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 w-16 shrink-0">{skill}</span>
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full bg-indigo-400', CEFR_WIDTH[level] ?? 'w-0')} />
                      </div>
                      <CefrBadge level={level} data-testid={`overview-skill-badge-${skill.toLowerCase()}`} />
                    </div>
                  )
                })}
              </div>
            </FieldRow>
          )}

          {/* Native languages as tags */}
          {student.nativeLanguages.length > 0 && (
            <FieldRow label="Native languages">
              <div className="flex flex-wrap gap-1.5" data-testid="overview-native-language">
                {student.nativeLanguages.map((lang) => (
                  <span key={lang} className="inline-flex items-center gap-1 text-sm text-zinc-700">
                    {lang}
                    <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[0.625rem] font-bold uppercase bg-zinc-100 text-zinc-500">
                      {langCode(lang)}
                    </span>
                  </span>
                ))}
              </div>
            </FieldRow>
          )}

          <FieldRow label="Learning goals">
            <ChipList items={student.learningGoals.flatMap(g => [g.text, ...g.children.map(c => `↳ ${c.text}`)])} emptyText="None specified" />
          </FieldRow>

          <FieldRow label="Interests">
            <ChipList items={student.interests} emptyText="None specified" />
          </FieldRow>

          <FieldRow label="Areas to improve">
            {student.weaknesses.length === 0
              ? <span className="text-zinc-400 text-sm">None specified</span>
              : <div className="flex flex-wrap gap-1.5">
                  {student.weaknesses.map((w, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded px-2 py-0.5"
                    >
                      {w.description}
                      <span className="text-indigo-400">({w.weaknessType})</span>
                    </span>
                  ))}
                </div>
            }
          </FieldRow>

          {student.difficulties.length > 0 && (
            <FieldRow label="Specific difficulties">
              <div className="space-y-2">
                {student.difficulties.map((d) => {
                  const isCovered = d.status === 'Covered'
                  return (
                    <div key={d.id} className="flex items-start gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-zinc-700', isCovered && 'line-through text-zinc-400')}>
                          {d.description}
                        </span>
                        {d.subcategory && (
                          <span className="ml-1 text-zinc-400 text-xs">({d.subcategory})</span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200 shrink-0">
                        {d.competency}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs shrink-0',
                          d.severity === 'high' ? 'border-red-200 text-red-600' :
                          d.severity === 'medium' ? 'border-amber-200 text-amber-600' :
                          'border-blue-200 text-blue-600'
                        )}
                      >
                        {d.severity}
                      </Badge>
                      {d.trend && d.trend !== 'stable' && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs shrink-0',
                            d.trend === 'worsening' ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'
                          )}
                        >
                          {d.trend}
                        </Badge>
                      )}
                      {isCovered && (
                        <Badge variant="secondary" className="text-xs shrink-0 bg-zinc-100 text-zinc-500">
                          Covered
                        </Badge>
                      )}
                      {onToggleDifficultyStatus && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-700 shrink-0"
                          onClick={() => onToggleDifficultyStatus(d.id, isCovered ? 'Active' : 'Covered')}
                          data-testid={`toggle-difficulty-status-${d.id}`}
                        >
                          {isCovered ? 'Mark Active' : 'Mark Covered'}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </FieldRow>
          )}

          {parsedPersonalNotes && (
            <FieldRow label="Personal notes">
              <div className="space-y-3" data-testid="overview-personal-notes">
                {parsedPersonalNotes.sections.map((section) => (
                  <div key={section.label || 'personal-notes'}>
                    {section.label && (
                      <p className="text-xs font-medium text-zinc-500 mb-0.5">{section.label}</p>
                    )}
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{section.text}</p>
                  </div>
                ))}
              </div>
            </FieldRow>
          )}

          {parsedTeachingNotes && (
            <FieldRow label="Teaching notes">
              <div className="space-y-3" data-testid="overview-teaching-notes">
                {parsedTeachingNotes.sections.map((section) => (
                  <div key={section.label || 'teaching-notes'}>
                    {section.label && (
                      <p className="text-xs font-medium text-zinc-500 mb-0.5">{section.label}</p>
                    )}
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{section.text}</p>
                  </div>
                ))}
              </div>
            </FieldRow>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}
