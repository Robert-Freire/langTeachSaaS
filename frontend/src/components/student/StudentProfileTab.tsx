import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Student } from '@/api/students'
import type { TeacherFollowup } from '@/api/followups'
import { parseNotes } from './studentNoteUtils'
import { TeachingTodosCard } from './TeachingTodosCard'
import { StudentFollowupsCard } from './StudentFollowupsCard'

interface Props {
  student: Student
  followups?: TeacherFollowup[]
  onFollowupChange?: () => void
  onToggleDifficultyStatus?: (id: string, status: 'Active' | 'Covered') => void
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-zinc-500 mb-3">
      {children}
    </h3>
  )
}

function FieldValue({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="text-xs text-zinc-400 shrink-0 w-28">{label}</span>
      <span className="text-sm text-[#1A1B22]">{value}</span>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-zinc-400 italic">{text}</p>
}

export function StudentProfileTab({ student, followups = [], onFollowupChange, onToggleDifficultyStatus }: Props) {
  const parsedPersonalNotes = parseNotes(student.personalNotes)
  const parsedTeachingNotes = parseNotes(student.teachingNotes)

  const hasAbout = student.birthYear || student.profession || student.countryOfOrigin ||
    student.cityOfOrigin || student.countryOfResidence || student.cityOfResidence ||
    student.reasonForStudying

  const location = [student.cityOfResidence, student.countryOfResidence].filter(Boolean).join(', ')
  const origin = [student.cityOfOrigin, student.countryOfOrigin].filter(Boolean).join(', ')

  return (
    <div
      className="bg-white rounded-2xl p-6 lg:p-8"
      style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
      data-testid="student-profile-tab"
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        {/* Left column (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          {/* About */}
          <section data-testid="profile-about">
            <SectionHeader>About</SectionHeader>
            {hasAbout ? (
              <div>
                {origin && <FieldValue label="Origin" value={origin} />}
                {location && <FieldValue label="Lives in" value={location} />}
                {student.birthYear != null && (() => {
                  const currentYear = new Date().getFullYear()
                  return (
                    <FieldValue
                      label="Birth year"
                      value={student.birthYear <= currentYear
                        ? `${student.birthYear} (${currentYear - student.birthYear} years)`
                        : `${student.birthYear}`}
                    />
                  )
                })()}
                <FieldValue label="Profession" value={student.profession} />
                <FieldValue label="Reason" value={student.reasonForStudying} />
              </div>
            ) : (
              <EmptyState text="No identity details added yet" />
            )}
          </section>

          {/* Languages */}
          <section data-testid="profile-languages">
            <SectionHeader>Languages</SectionHeader>
            <div>
              <FieldValue
                label="Native"
                value={student.nativeLanguages.length > 0 ? student.nativeLanguages.join(', ') : null}
              />
              {student.spokenLanguages.length > 0 && (
                <FieldValue label="Spoken" value={student.spokenLanguages.join(', ')} />
              )}
              <FieldValue
                label="Learning"
                value={`${student.learningLanguage} (${student.cefrLevel})`}
              />
            </div>
            {student.nativeLanguages.length === 0 && student.spokenLanguages.length === 0 && (
              <EmptyState text="No language details added yet" />
            )}
          </section>

          {/* Personal notes */}
          <section data-testid="profile-personal-notes">
            <SectionHeader>Personal Notes</SectionHeader>
            {parsedPersonalNotes ? (
              <div className="space-y-2">
                {parsedPersonalNotes.sections.map((section, i) => (
                  <div key={`pn-${i}-${section.label}`}>
                    {section.label && (
                      <p className="text-xs font-medium text-zinc-500 mb-0.5">{section.label}</p>
                    )}
                    <p className="text-sm text-[#1A1B22] whitespace-pre-wrap">{section.text}</p>
                  </div>
                ))}
              </div>
            ) : student.personalNotes ? (
              <p className="text-sm text-[#1A1B22] whitespace-pre-wrap">{student.personalNotes}</p>
            ) : (
              <EmptyState text="No personal notes" />
            )}
          </section>

          {/* Teaching notes */}
          <section data-testid="profile-teaching-notes">
            <SectionHeader>Teaching Notes</SectionHeader>
            {parsedTeachingNotes ? (
              <div className="space-y-2">
                {parsedTeachingNotes.sections.map((section, i) => (
                  <div key={`tn-${i}-${section.label}`}>
                    {section.label && (
                      <p className="text-xs font-medium text-zinc-500 mb-0.5">{section.label}</p>
                    )}
                    <p className="text-sm text-[#1A1B22] whitespace-pre-wrap">{section.text}</p>
                  </div>
                ))}
              </div>
            ) : student.teachingNotes ? (
              <p className="text-sm text-[#1A1B22] whitespace-pre-wrap">{student.teachingNotes}</p>
            ) : (
              <EmptyState text="No teaching notes" />
            )}
          </section>
        </div>

        {/* Right column (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Learning goals */}
          <section data-testid="profile-learning-goals">
            <SectionHeader>Learning Goals</SectionHeader>
            {student.learningGoals.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {student.learningGoals.map((goal) => (
                  <span
                    key={goal}
                    className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full px-2.5 py-1"
                  >
                    {goal}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState text="No learning goals set" />
            )}
          </section>

          {/* Short-term objectives */}
          <section data-testid="profile-objectives">
            <SectionHeader>Short-Term Objectives</SectionHeader>
            {student.shortTermObjectives.length > 0 ? (
              <ul className="space-y-2">
                {student.shortTermObjectives.map((obj) => (
                  <li key={obj.id} className="text-sm text-[#1A1B22]">
                    {obj.text}
                    {obj.targetDate && (
                      <span className="ml-2 text-xs text-zinc-400">
                        Target: {new Date(obj.targetDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="No objectives set" />
            )}
          </section>

          {/* Difficulties */}
          <section data-testid="profile-difficulties">
            <SectionHeader>Difficulties</SectionHeader>
            {student.difficulties.length > 0 ? (
              <div className="space-y-1.5">
                {student.difficulties.map((d, index) => {
                  const isCovered = d.status === 'Covered'
                  return (
                    <div
                      key={d.id}
                      className={`flex flex-wrap items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                        index % 2 === 0 ? 'bg-zinc-50/80' : ''
                      }`}
                      data-testid="difficulty-row"
                    >
                      <span className={`basis-full sm:basis-auto sm:flex-1 min-w-0 ${isCovered ? 'line-through text-zinc-400' : 'text-[#1A1B22]'}`}>
                        {d.description}
                        {d.subcategory && (
                          <span className="text-zinc-400 text-xs ml-1">({d.subcategory})</span>
                        )}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0 border-none bg-zinc-100 text-zinc-600"
                      >
                        {d.competency}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 border-none ${
                          d.severity === 'high' ? 'bg-amber-100 text-amber-700' :
                          d.severity === 'medium' ? 'bg-zinc-100 text-zinc-600' :
                          'bg-zinc-50 text-zinc-500'
                        }`}
                      >
                        {d.severity}
                      </Badge>
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
            ) : (
              <EmptyState text="No difficulties tracked" />
            )}
          </section>

          {/* Teaching Todos */}
          <section data-testid="profile-teaching-todos">
            <SectionHeader>Teaching Todos</SectionHeader>
            <TeachingTodosCard todos={student.teachingTodos} />
          </section>

          {/* Pending Followups */}
          <section data-testid="profile-followups">
            <StudentFollowupsCard
              followups={followups}
              studentId={student.id}
              onFollowupChange={onFollowupChange ?? (() => {})}
            />
          </section>

          {/* Commercial */}
          <section data-testid="profile-commercial">
            <SectionHeader>Commercial</SectionHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs border-none ${
                  student.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-zinc-100 text-zinc-500'
                }`}
                data-testid="active-status-badge"
              >
                {student.isActive ? 'Active' : 'Former'}
              </Badge>
              <Badge
                variant="outline"
                className="text-xs border-none bg-zinc-100 text-zinc-600"
              >
                {student.isCorporate ? 'Corporate' : 'Private'}
              </Badge>
              {student.rate && (
                <span className="text-sm text-[#1A1B22]">{student.rate}</span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
