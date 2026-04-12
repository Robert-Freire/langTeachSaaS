import { useState, useRef } from 'react'
import { Pencil, X, Plus, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Student } from '@/api/students'
import type { TeacherFollowup } from '@/api/followups'
import { parseNotes } from './studentNoteUtils'
import { TeachingTodosCard } from './TeachingTodosCard'
import { StudentFollowupsCard } from './StudentFollowupsCard'
import { getObjectiveUrgency } from '@/lib/objectiveUrgency'
import { SectionHeader } from './SectionHeader'

interface Props {
  student: Student
  followups?: TeacherFollowup[]
  onFollowupChange?: () => void
  onToggleDifficultyStatus?: (id: string, status: 'Active' | 'Covered') => void
  onSaveReasonForStudying?: (value: string) => Promise<void>
  onSaveInterests?: (value: string[]) => Promise<void>
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

function ReasonHero({
  student,
  onSave,
}: {
  student: Student
  onSave?: (value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(student.reasonForStudying ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } catch {
      // caller logs the failure; keep editor open so user can retry
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(student.reasonForStudying ?? '')
    setEditing(false)
  }

  return (
    <div
      className="group relative bg-indigo-50/60 rounded-xl px-4 py-3"
      data-testid="reason-hero"
    >
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-lg italic text-[#1A1B22] bg-white border border-indigo-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={3}
            maxLength={512}
            placeholder="Why is this student learning?"
            autoFocus
            data-testid="reason-textarea"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 px-3 text-xs"
              data-testid="reason-save-btn"
            >
              <Check className="h-3 w-3 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-7 px-3 text-xs text-zinc-500"
              data-testid="reason-cancel-btn"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          {student.reasonForStudying ? (
            <p className="text-lg italic text-[#1A1B22] leading-relaxed flex-1" data-testid="reason-quote">
              &ldquo;{student.reasonForStudying}&rdquo;
            </p>
          ) : (
            <p className="text-sm text-zinc-400 italic flex-1" data-testid="reason-quote">
              No reason for studying added yet.
            </p>
          )}
          {onSave && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-indigo-600 rounded"
              aria-label="Edit reason for studying"
              data-testid="reason-edit-btn"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function InterestsSection({
  student,
  onSave,
}: {
  student: Student
  onSave?: (value: string[]) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(student.interests)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAddInterest(value: string) {
    const trimmed = value.trim()
    if (trimmed && !draft.includes(trimmed)) {
      setDraft((prev) => [...prev, trimmed])
    }
    setInputValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddInterest(inputValue)
    }
    if (e.key === 'Backspace' && inputValue === '' && draft.length > 0) {
      setDraft((prev) => prev.slice(0, -1))
    }
  }

  function handleRemove(item: string) {
    setDraft((prev) => prev.filter((i) => i !== item))
  }

  async function handleSave() {
    if (!onSave) return
    const trimmed = inputValue.trim()
    const finalList =
      trimmed && !draft.includes(trimmed) ? [...draft, trimmed] : draft
    setSaving(true)
    try {
      await onSave(finalList)
      setDraft(finalList)
      setEditing(false)
      setInputValue('')
    } catch {
      // caller logs the failure; keep editor open so user can retry
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(student.interests)
    setInputValue('')
    setEditing(false)
  }

  return (
    <section data-testid="profile-interests">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader>Interests</SectionHeader>
        {onSave && !editing && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 50) }}
              className="p-1 text-zinc-400 hover:text-indigo-600 rounded transition-colors"
              aria-label="Edit interests"
              data-testid="interests-edit-btn"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 50) }}
              className="p-1 text-zinc-400 hover:text-indigo-600 rounded transition-colors"
              aria-label="Add interest"
              data-testid="interests-add-btn"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div
            className="flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-indigo-300 bg-white px-3 py-2 cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            {draft.map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded px-2 py-0.5"
              >
                {interest}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemove(interest) }}
                  className="text-indigo-400 hover:text-indigo-700"
                  aria-label={`Remove ${interest}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (inputValue.trim()) handleAddInterest(inputValue) }}
              placeholder={draft.length === 0 ? 'Type and press Enter' : ''}
              className="flex-1 min-w-16 outline-none text-sm bg-transparent placeholder:text-zinc-400"
              data-testid="interests-input"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 px-3 text-xs"
              data-testid="interests-save-btn"
            >
              <Check className="h-3 w-3 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-7 px-3 text-xs text-zinc-500"
              data-testid="interests-cancel-btn"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : student.interests.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {student.interests.map((interest) => (
            <span
              key={interest}
              className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full px-2.5 py-1"
              data-testid="interest-tag"
            >
              {interest}
            </span>
          ))}
        </div>
      ) : (
        <EmptyState text="No interests added yet" />
      )}
    </section>
  )
}

export function StudentProfileTab({ student, followups = [], onFollowupChange, onToggleDifficultyStatus, onSaveReasonForStudying, onSaveInterests }: Props) {
  const parsedPersonalNotes = parseNotes(student.personalNotes)
  const parsedTeachingNotes = parseNotes(student.teachingNotes)

  const hasAbout = student.birthYear || student.profession || student.countryOfOrigin ||
    student.cityOfOrigin || student.countryOfResidence || student.cityOfResidence

  const location = [student.cityOfResidence, student.countryOfResidence].filter(Boolean).join(', ')
  const origin = [student.cityOfOrigin, student.countryOfOrigin].filter(Boolean).join(', ')

  return (
    <div
      className="bg-white rounded-2xl p-6 lg:p-8"
      style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
      data-testid="student-profile-tab"
    >
      {/* Hero: The Why / Motivation */}
      <section className="mb-8 pb-8 border-b border-zinc-100" data-testid="profile-hero">
        <SectionHeader>The Why / Motivation</SectionHeader>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start">
          <div className="flex-1 min-w-0">
            <ReasonHero key={student.id} student={student} onSave={onSaveReasonForStudying} />
          </div>
          {student.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:max-w-[200px]" data-testid="hero-interests">
              {student.interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-block bg-zinc-100 text-zinc-600 text-xs font-medium rounded-full px-2.5 py-1"
                  data-testid="hero-interest-tag"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        {/* Left column (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Focus Areas & Difficulties */}
          <section data-testid="profile-focus-areas">
            <SectionHeader>Focus Areas &amp; Difficulties</SectionHeader>
            {student.difficulties.length === 0 && student.weaknesses.length === 0 ? (
              <EmptyState text="No focus areas tracked" />
            ) : (
              <>
                {student.difficulties.length > 0 && (
                  <div className="mb-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="text-xs font-medium text-zinc-400 pb-2 pr-4">Area</th>
                          <th className="text-xs font-medium text-zinc-400 pb-2 pr-4">Subcategory</th>
                          <th className="text-xs font-medium text-zinc-400 pb-2 pr-4">Trend</th>
                          <th className="text-xs font-medium text-zinc-400 pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.difficulties.map((d) => {
                          const isCovered = d.status === 'Covered'
                          const trendLabel = d.trend.charAt(0).toUpperCase() + d.trend.slice(1)
                          const trendColor =
                            d.trend.toLowerCase() === 'improving'
                              ? 'bg-green-100 text-green-700'
                              : d.trend.toLowerCase() === 'regressing' || d.trend.toLowerCase() === 'worsening'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-zinc-100 text-zinc-600'
                          return (
                            <tr key={d.id} data-testid="difficulty-row" className="border-t border-zinc-50">
                              <td className="py-2 pr-4 text-[#1A1B22] align-top">{d.competency}</td>
                              <td className="py-2 pr-4 text-[#1A1B22] align-top">
                                {d.description}
                                {d.subcategory && (
                                  <span className="text-zinc-400 text-xs ml-1">({d.subcategory})</span>
                                )}
                              </td>
                              <td className="py-2 pr-4 align-top">
                                <span className={`inline-block text-xs font-medium rounded px-1.5 py-0.5 ${trendColor}`}>
                                  {trendLabel}
                                </span>
                              </td>
                              <td className="py-2 align-top">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                                      isCovered ? 'text-zinc-400' : 'text-green-600'
                                    }`}
                                    data-testid={`difficulty-status-${d.id}`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        isCovered ? 'bg-zinc-400' : 'bg-green-500'
                                      }`}
                                    />
                                    {isCovered ? 'Covered' : 'Working'}
                                  </span>
                                  {onToggleDifficultyStatus && (
                                    <button
                                      type="button"
                                      className="text-xs text-zinc-300 hover:text-zinc-600 transition-colors ml-1"
                                      onClick={() => onToggleDifficultyStatus(d.id, isCovered ? 'Active' : 'Covered')}
                                      data-testid={`toggle-difficulty-status-${d.id}`}
                                      aria-label={isCovered ? 'Mark as working' : 'Mark as covered'}
                                    >
                                      ↕
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {student.weaknesses.length > 0 && (
                  <div data-testid="profile-weaknesses">
                    <p className="text-xs text-zinc-400 font-medium mb-1.5">Areas to Improve</p>
                    <div className="space-y-1.5">
                      {student.weaknesses.map((w, i) => {
                        const typeLabel = w.weaknessType.charAt(0).toUpperCase() + w.weaknessType.slice(1)
                        const typeColor =
                          w.weaknessType === 'grammatical'
                            ? 'bg-indigo-100 text-indigo-700'
                            : w.weaknessType === 'lexical'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-zinc-100 text-zinc-600'
                        return (
                          <div key={`weakness-${i}-${w.weaknessType}`} className="flex items-center gap-2" data-testid="weakness-row">
                            <span className={`text-xs font-medium rounded px-1.5 py-0.5 shrink-0 ${typeColor}`} data-testid="weakness-type-badge">
                              {typeLabel}
                            </span>
                            <span className="text-sm text-[#1A1B22]">{w.description}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Pedagogical Diagnostic */}
          <section data-testid="profile-pedagogical-diagnostic">
            <SectionHeader>Pedagogical Diagnostic</SectionHeader>

            {/* Learning Goals */}
            <div className="mb-4" data-testid="profile-learning-goals">
              <p className="text-xs text-zinc-400 font-medium mb-1.5">Learning Goals</p>
              {student.learningGoals.length > 0 ? (
                <ul className="space-y-1 list-none">
                  {student.learningGoals.map((goal) => (
                    <li key={goal} className="flex items-start gap-2 text-sm text-[#1A1B22]">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      {goal}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState text="No learning goals set" />
              )}
            </div>

            {/* Short-Term Objectives */}
            <div data-testid="profile-objectives">
              <p className="text-xs text-zinc-400 font-medium mb-1.5">Short-Term Objectives</p>
              {student.shortTermObjectives.length > 0 ? (
                <ul className="space-y-2">
                  {student.shortTermObjectives.map((obj) => {
                    const urgency = getObjectiveUrgency(obj.targetDate)
                    return (
                      <li
                        key={obj.id}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          urgency === 'overdue'
                            ? 'border-2 border-red-300 bg-red-50'
                            : urgency === 'critical'
                              ? 'border-2 border-orange-300 bg-orange-50'
                              : 'bg-zinc-50'
                        }`}
                        data-testid="objective-row"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[#1A1B22]">{obj.text}</span>
                          {urgency === 'overdue' && (
                            <span className="text-xs font-bold text-red-600 shrink-0 uppercase" data-testid="objective-overdue-label">
                              OVERDUE
                            </span>
                          )}
                          {urgency === 'critical' && (
                            <span className="text-xs font-bold text-orange-600 shrink-0 uppercase" data-testid="objective-critical-label">
                              Critical
                            </span>
                          )}
                        </div>
                        {obj.targetDate && (
                          <span className="text-xs text-zinc-400 mt-0.5 block">
                            Target: {new Date(obj.targetDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <EmptyState text="No objectives set" />
              )}
            </div>
          </section>

          {/* Personal notes */}
          <section data-testid="profile-personal-notes">
            <SectionHeader>Sensitivities / Life Context</SectionHeader>
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
            <SectionHeader>Pedagogical Observations</SectionHeader>
            {parsedTeachingNotes ? (
              <div className="space-y-2 border-l-2 border-indigo-200 pl-3">
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
              <p className="text-sm text-[#1A1B22] whitespace-pre-wrap border-l-2 border-indigo-200 pl-3">{student.teachingNotes}</p>
            ) : (
              <EmptyState text="No pedagogical observations" />
            )}
          </section>
        </div>

        {/* Right column (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity Details */}
          <section data-testid="profile-about">
            <SectionHeader>Identity Details</SectionHeader>
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
              </div>
            ) : (
              <EmptyState text="No identity details added yet" />
            )}
          </section>

          {/* Interests (dedicated editable section) */}
          <InterestsSection key={student.id} student={student} onSave={onSaveInterests} />

          {/* Languages */}
          <section data-testid="profile-languages">
            <SectionHeader>Language Ecosystem</SectionHeader>
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
              {student.officialCefrLevel && (
                <FieldValue label="Official level" value={student.officialCefrLevel} />
              )}
            </div>
            {student.nativeLanguages.length === 0 && student.spokenLanguages.length === 0 && (
              <EmptyState text="No language details added yet" />
            )}
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
        </div>
      </div>
    </div>
  )
}
