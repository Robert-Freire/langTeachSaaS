import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Student } from '@/api/students'
import { parseNotes } from './studentNoteUtils'

interface Props {
  student: Student
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

export function StudentProfileOverview({ student }: Props) {
  const parsedNotes = parseNotes(student.notes)

  return (
    <Card className="border-zinc-200" data-testid="student-profile-overview">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Teaching Context</CardTitle>
          <Link
            to={`/students/${student.id}/edit`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            data-testid="edit-profile-link"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit profile
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="space-y-4">
          <FieldRow label="Native language">
            <span className="text-sm text-zinc-800" data-testid="overview-native-language">
              {student.nativeLanguage || <span className="text-zinc-400 italic">Not specified</span>}
            </span>
          </FieldRow>

          <FieldRow label="Learning goals">
            <ChipList items={student.learningGoals} emptyText="None specified" />
          </FieldRow>

          <FieldRow label="Interests">
            <ChipList items={student.interests} emptyText="None specified" />
          </FieldRow>

          <FieldRow label="Areas to improve">
            <ChipList items={student.weaknesses} emptyText="None specified" />
          </FieldRow>

          {student.difficulties.length > 0 && (
            <FieldRow label="Specific difficulties">
              <div className="space-y-1">
                {student.difficulties.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-sm text-zinc-700">
                    <span>{d.item}</span>
                    <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200">
                      {d.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200">
                      {d.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </FieldRow>
          )}

          {parsedNotes && (
            <FieldRow label="Notes">
              <div className="space-y-3" data-testid="overview-notes">
                {parsedNotes.sections.map((section) => (
                  <div key={section.label || 'notes'}>
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
