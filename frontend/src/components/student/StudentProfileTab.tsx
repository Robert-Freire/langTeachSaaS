import { useState, useRef, useEffect } from 'react'
import { useBlurSave } from '../../hooks/useBlurSave'
import { Pencil, X, Plus, Check, GraduationCap, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Student } from '@/api/students'
import type { TeacherFollowup } from '@/api/followups'
import { parseNotes } from './studentNoteUtils'
import { TeachingTodosCard } from './TeachingTodosCard'
import { StudentFollowupsCard } from './StudentFollowupsCard'
import { getObjectiveUrgency } from '@/lib/objectiveUrgency'
import { SectionHeader } from './SectionHeader'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { langCode } from './langUtils'
import { SavedIndicator } from '@/components/ui/SavedIndicator'

const SKILL_ORDER = ['Reading', 'Writing', 'Speaking', 'Listening']

interface Props {
  student: Student
  followups?: TeacherFollowup[]
  onFollowupChange?: () => void
  onStudentChange: () => void
  difficultyToggleError?: string | null
  onToggleDifficultyStatus?: (id: string, status: 'Active' | 'Covered') => void
  onSaveReasonForStudying?: (value: string) => Promise<void>
  onSaveInterests?: (value: string[]) => Promise<void>
  onSaveLearningGoal?: (text: string) => Promise<void>
  onSaveShortTermObjective?: (text: string) => Promise<void>
  onSaveDifficulty?: (vars: { competency: string; description: string }) => Promise<void>
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-zinc-400 italic">{text}</p>
}

// ------------------------------------------------------------------
// Skill badge (large square, for horizontal Skill Assessment row)
// ------------------------------------------------------------------
function SkillBadgeSquare({ skill, level }: { skill: string; level: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[0.625rem] font-bold uppercase tracking-wide text-zinc-500">{skill}</span>
      <CefrBadge
        level={level}
        className="w-12 h-12 rounded-lg text-base px-0 py-0"
        data-testid={`skill-badge-${skill.toLowerCase()}`}
      />
    </div>
  )
}

// ------------------------------------------------------------------
// Inline-add components
// ------------------------------------------------------------------
function InlineAddInput({
  placeholder,
  onSave,
  'data-testid': testId,
}: {
  placeholder: string
  onSave: (text: string) => Promise<void>
  'data-testid'?: string
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleSave() {
    const val = text.trim()
    if (!val || saving) return
    setSaving(true)
    try {
      await onSave(val)
      setText('')
      setOpen(false)
    } catch {
      // keep open on error
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="p-1 text-zinc-400 hover:text-indigo-600 rounded transition-colors"
        aria-label={`Add ${placeholder}`}
        data-testid={testId}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="flex gap-2 mt-2" data-testid={`${testId}-row`}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') { setText(''); setOpen(false) }
        }}
        placeholder={placeholder}
        maxLength={500}
        className="flex-1 rounded-lg border border-zinc-200 bg-indigo-50 px-3 py-1.5 text-sm text-[#1A1B22] placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        data-testid={`${testId}-input`}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !text.trim()}
        className="shrink-0 rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        data-testid={`${testId}-save`}
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => { setText(''); setOpen(false) }}
        className="shrink-0 rounded-lg bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200 transition-colors"
        data-testid={`${testId}-cancel`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function InlineAddDifficulty({
  onSave,
}: {
  onSave: (vars: { competency: string; description: string }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [competency, setCompetency] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const competencyRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setOpen(true)
    setTimeout(() => competencyRef.current?.focus(), 50)
  }

  async function handleSave() {
    const comp = competency.trim()
    const desc = description.trim()
    if (!comp || !desc || saving) return
    setSaving(true)
    try {
      await onSave({ competency: comp, description: desc })
      setCompetency('')
      setDescription('')
      setOpen(false)
    } catch {
      // keep open
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="p-1 text-zinc-400 hover:text-indigo-600 rounded transition-colors"
        aria-label="Add focus area"
        data-testid="difficulty-add-btn"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 mt-2" data-testid="difficulty-add-row">
      <div className="flex gap-2">
        <input
          ref={competencyRef}
          type="text"
          value={competency}
          onChange={e => setCompetency(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setCompetency(''); setDescription(''); setOpen(false) } }}
          placeholder="Area (e.g. Grammar)"
          maxLength={100}
          className="w-32 rounded-lg border border-zinc-200 bg-indigo-50 px-3 py-1.5 text-sm text-[#1A1B22] placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          data-testid="difficulty-add-competency"
        />
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') { setCompetency(''); setDescription(''); setOpen(false) }
          }}
          placeholder="Description"
          maxLength={300}
          className="flex-1 rounded-lg border border-zinc-200 bg-indigo-50 px-3 py-1.5 text-sm text-[#1A1B22] placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          data-testid="difficulty-add-description"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !competency.trim() || !description.trim()}
          className="shrink-0 rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          data-testid="difficulty-add-save"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => { setCompetency(''); setDescription(''); setOpen(false) }}
          className="shrink-0 rounded-lg bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200 transition-colors"
          data-testid="difficulty-add-cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Motivation Hero (banner with Manrope quote + interest chips inside)
// Autosave on blur. No Save/Cancel buttons.
// ------------------------------------------------------------------
function MotivationHero({
  student,
  onSave,
}: {
  student: Student
  onSave?: (value: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(student.reasonForStudying ?? '')
  const { savedVisible, fieldError: saveError, onSaveSuccess, onSaveError } = useBlurSave()
  const lastSavedRef = useRef(student.reasonForStudying ?? '')
  const isRevertingRef = useRef(false)

  // Keep lastSavedRef in sync with server state when not editing; draft is set from prop on edit enter
  useEffect(() => {
    if (!editing) lastSavedRef.current = student.reasonForStudying ?? ''
  }, [student.reasonForStudying, editing])

  async function handleBlur() {
    if (!onSave || isRevertingRef.current) {
      isRevertingRef.current = false
      return
    }
    const value = draft.trim()
    try {
      await onSave(value)
      lastSavedRef.current = value
      onSaveSuccess()
      setEditing(false)
    } catch {
      onSaveError('Failed to save')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      isRevertingRef.current = true
      setDraft(lastSavedRef.current)
      setEditing(false)
    }
  }

  return (
    <div
      className="group relative bg-indigo-50/60 rounded-xl px-6 py-5 overflow-hidden"
      data-testid="reason-hero"
    >
      {/* Decorative circle */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-100/50 rounded-full -mr-20 -mt-20 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-indigo-600 opacity-70">
            The Why / Motivation
          </p>
          <div className="flex items-center gap-2">
            {saveError && (
              <span className="text-xs text-red-500" data-testid="reason-save-error">{saveError}</span>
            )}
            <SavedIndicator visible={savedVisible} />
          </div>
        </div>

        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full font-manrope text-xl italic text-[#1A1B22] bg-white border border-indigo-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={3}
            maxLength={512}
            placeholder="Why is this student learning?"
            autoFocus
            data-testid="reason-textarea"
          />
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="flex-1 min-w-0">
              {student.reasonForStudying ? (
                <div
                  className="flex items-start gap-2 cursor-pointer"
                  onClick={() => { const v = student.reasonForStudying ?? ''; setDraft(v); lastSavedRef.current = v; setEditing(true) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { const v = student.reasonForStudying ?? ''; setDraft(v); lastSavedRef.current = v; setEditing(true) } }}
                  data-testid="reason-edit-trigger"
                >
                  <p
                    className="font-manrope text-2xl font-extrabold text-primary italic leading-snug flex-1"
                    data-testid="reason-quote"
                  >
                    &ldquo;{student.reasonForStudying}&rdquo;
                  </p>
                  {onSave && (
                    <span
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 shrink-0 mt-1"
                      aria-hidden="true"
                      data-testid="reason-edit-btn"
                    >
                      <Pencil className="h-3 w-3" />
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => { const v = student.reasonForStudying ?? ''; setDraft(v); lastSavedRef.current = v; setEditing(true) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { const v = student.reasonForStudying ?? ''; setDraft(v); lastSavedRef.current = v; setEditing(true) } }}
                  data-testid="reason-edit-trigger"
                >
                  <p className="font-manrope text-lg italic text-zinc-400 flex-1" data-testid="reason-quote">
                    Why is this student learning {student.learningLanguage}?
                  </p>
                  {onSave && (
                    <span
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 shrink-0"
                      aria-hidden="true"
                      data-testid="reason-edit-btn"
                    >
                      <Pencil className="h-3 w-3" />
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Interest chips pulled into banner */}
            {student.interests.length > 0 && (
              <div className="flex flex-col gap-1.5 lg:max-w-[180px]" data-testid="hero-interests">
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-indigo-500 opacity-70">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.interests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full px-3 py-1"
                      data-testid="hero-interest-tag"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Interests section (right column, always-editable chip input)
// Saves immediately on add (Enter/comma) or remove (×). No edit mode.
// ------------------------------------------------------------------
function InterestsSection({
  student,
  onSave,
}: {
  student: Student
  onSave?: (value: string[]) => Promise<void>
}) {
  const [chips, setChips] = useState<string[]>(student.interests)
  const [inputValue, setInputValue] = useState('')
  const { savedVisible, fieldError: saveError, onSaveSuccess, onSaveError } = useBlurSave()
  const inputRef = useRef<HTMLInputElement>(null)

  async function commitAdd(value: string) {
    const trimmed = value.trim()
    if (!trimmed || chips.includes(trimmed) || !onSave) return
    const next = [...chips, trimmed]
    setChips(next)
    setInputValue('')
    try {
      await onSave(next)
      onSaveSuccess()
    } catch {
      setChips(chips) // revert
      onSaveError('Failed to save')
    }
  }

  async function commitRemove(item: string) {
    if (!onSave) return
    const next = chips.filter((c) => c !== item)
    setChips(next)
    try {
      await onSave(next)
      onSaveSuccess()
    } catch {
      setChips(chips) // revert
      onSaveError('Failed to save')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      void commitAdd(inputValue)
    }
    if (e.key === 'Backspace' && inputValue === '' && chips.length > 0) {
      void commitRemove(chips[chips.length - 1])
    }
  }

  return (
    <section data-testid="profile-interests">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader>Interests</SectionHeader>
        <div className="flex items-center gap-2">
          {saveError && (
            <span className="text-xs text-red-500" data-testid="interests-save-error">{saveError}</span>
          )}
          <SavedIndicator visible={savedVisible} />
        </div>
      </div>

      <div
        className="flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 cursor-text focus-within:border-indigo-300 transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((interest) => (
          <span
            key={interest}
            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded px-2 py-0.5"
            data-testid="interest-tag"
          >
            {interest}
            {onSave && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void commitRemove(interest) }}
                className="text-indigo-400 hover:text-indigo-700"
                aria-label={`Remove ${interest}`}
                data-testid={`interest-remove-${interest}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {onSave && (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chips.length === 0 ? 'Add interest...' : ''}
            className="flex-1 min-w-16 outline-none text-sm bg-transparent placeholder:text-zinc-400"
            data-testid="interests-input"
          />
        )}
      </div>
    </section>
  )
}

// ------------------------------------------------------------------
// FieldValue (used in Working Memory sidebar)
// ------------------------------------------------------------------
function FieldValue({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-[#F4F2FD] last:border-0">
      <span className="text-sm font-medium text-zinc-500">{label}</span>
      <span className="text-sm font-bold text-[#1A1B22] text-right">{value}</span>
    </div>
  )
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------
export function StudentProfileTab({
  student,
  followups = [],
  onFollowupChange,
  onStudentChange,
  difficultyToggleError,
  onToggleDifficultyStatus,
  onSaveReasonForStudying,
  onSaveInterests,
  onSaveLearningGoal,
  onSaveShortTermObjective,
  onSaveDifficulty,
}: Props) {
  const [showEmptySections, setShowEmptySections] = useState(false)

  const parsedPersonalNotes = parseNotes(student.personalNotes)
  const parsedTeachingNotes = parseNotes(student.teachingNotes)

  const hasAbout = !!(
    student.birthYear ||
    student.profession ||
    student.countryOfOrigin ||
    student.cityOfOrigin ||
    student.countryOfResidence ||
    student.cityOfResidence
  )
  const hasWorkingMemory = !!(student.personalNotes || student.teachingNotes)

  const location = [student.cityOfResidence, student.countryOfResidence].filter(Boolean).join(', ')
  const origin = [student.cityOfOrigin, student.countryOfOrigin].filter(Boolean).join(', ')

  // TWM right sidebar is always visible; only left column dark card can be collapsed
  const anySectionCollapsed = !hasWorkingMemory && !showEmptySections

  return (
    <div
      className="bg-white rounded-2xl p-6 lg:p-8"
      style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
      data-testid="student-profile-tab"
    >
      {/* Hero: Motivation Banner */}
      <div className="mb-8" data-testid="profile-hero">
        <MotivationHero key={student.id} student={student} onSave={onSaveReasonForStudying} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* ============================================================
            LEFT COLUMN (8/12)
            ============================================================ */}
        <div className="lg:col-span-8 space-y-6">

          {/* Pedagogical Diagnostic card */}
          <section
            className="bg-[#FAFAFA] rounded-xl p-6"
            style={{ boxShadow: '0 2px 12px rgba(26,27,34,0.06)' }}
            data-testid="profile-pedagogical-diagnostic"
          >
            {/* Card header */}
            <div className="flex items-center gap-2 mb-6">
              <GraduationCap className="h-5 w-5 text-indigo-600 shrink-0" />
              <h3 className="font-manrope text-base font-bold text-[#1A1B22]">Pedagogical Diagnostic</h3>
            </div>

            <div className="space-y-6">
              {/* Learning Goals */}
              <div data-testid="profile-learning-goals">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Learning Goals</p>
                  {onSaveLearningGoal && (
                    <InlineAddInput
                      placeholder="Add a learning goal"
                      onSave={onSaveLearningGoal}
                      data-testid="goal-add-btn"
                    />
                  )}
                </div>
                {student.learningGoals.length > 0 ? (
                  <ul className="space-y-1 list-none">
                    {student.learningGoals.map((goal) => (
                      <li key={goal.id}>
                        <div className="flex items-start gap-2 text-sm text-[#1A1B22]">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                          {goal.text}
                        </div>
                        {goal.children.length > 0 && (
                          <ul className="mt-0.5 space-y-0.5 list-none pl-5">
                            {goal.children.map((child) => (
                              <li key={child.id} className="flex items-start gap-2 text-sm text-zinc-600">
                                <span className="mt-1.5 h-1 w-1 rounded-full bg-indigo-300 shrink-0" />
                                {child.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState text="No learning goals set" />
                )}
              </div>

              {/* Short-Term Objectives */}
              <div data-testid="profile-objectives">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Short-Term Objectives</p>
                  {onSaveShortTermObjective && (
                    <InlineAddInput
                      placeholder="Add an objective"
                      onSave={onSaveShortTermObjective}
                      data-testid="objective-add-btn"
                    />
                  )}
                </div>
                {student.shortTermObjectives.length > 0 ? (
                  <ul className="space-y-2">
                    {student.shortTermObjectives.map((obj) => {
                      const urgency = getObjectiveUrgency(obj.targetDate)
                      return (
                        <li
                          key={obj.id}
                          className={`rounded-lg px-3 py-2 text-sm ${
                            urgency === 'overdue'
                              ? 'border-l-4 border-red-400 bg-red-50'
                              : urgency === 'critical'
                                ? 'border-l-4 border-amber-400 bg-amber-50'
                                : 'bg-zinc-50'
                          }`}
                          data-testid="objective-row"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[#1A1B22] font-medium">{obj.text}</span>
                            {urgency === 'overdue' && (
                              <span className="text-xs font-bold text-red-600 shrink-0 uppercase" data-testid="objective-overdue-label">
                                OVERDUE
                              </span>
                            )}
                            {urgency === 'critical' && (
                              <span className="text-xs font-bold text-amber-600 shrink-0 uppercase" data-testid="objective-critical-label">
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

              {/* Skill Assessment - horizontal large square badges */}
              {Object.keys(student.skillLevelOverrides ?? {}).length > 0 && (
                <div data-testid="profile-skill-assessment">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Skill Assessment</p>
                  <div className="grid grid-cols-4 gap-3">
                    {SKILL_ORDER.filter((s) => student.skillLevelOverrides?.[s]).map((skill) => (
                      <SkillBadgeSquare key={skill} skill={skill} level={student.skillLevelOverrides[skill]} />
                    ))}
                  </div>
                </div>
              )}

              {/* Focus Areas & Difficulties */}
              <div data-testid="profile-focus-areas">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Focus Areas &amp; Difficulties</p>
                  {onSaveDifficulty && <InlineAddDifficulty onSave={onSaveDifficulty} />}
                </div>
                {difficultyToggleError && (
                  <span className="text-xs text-red-500 mb-2 block" data-testid="difficulty-toggle-error">{difficultyToggleError}</span>
                )}
                {student.difficulties.length === 0 && student.weaknesses.length === 0 ? (
                  <EmptyState text="No focus areas tracked" />
                ) : (
                  <>
                    {student.difficulties.length > 0 && (
                      <div className="overflow-x-auto rounded-lg border border-[#F4F2FD]">
                        <table className="w-full text-sm">
                          <thead className="bg-[#F4F2FD]">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-bold uppercase text-zinc-500">Area</th>
                              <th className="px-4 py-2 text-left text-xs font-bold uppercase text-zinc-500">Subcategory</th>
                              <th className="px-4 py-2 text-left text-xs font-bold uppercase text-zinc-500">Trend</th>
                              <th className="px-4 py-2 text-left text-xs font-bold uppercase text-zinc-500">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F4F2FD]">
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
                                <tr key={d.id} data-testid="difficulty-row" className="hover:bg-[#FAFAFA] transition-colors">
                                  <td className="px-4 py-3 font-semibold text-[#1A1B22] align-top">{d.competency}</td>
                                  <td className="px-4 py-3 text-zinc-600 align-top">{d.subcategory || d.description}</td>
                                  <td className="px-4 py-3 align-top">
                                    <span className={`inline-block text-xs font-bold rounded px-1.5 py-0.5 ${trendColor}`}>
                                      {trendLabel}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${
                                          isCovered ? 'text-zinc-400' : 'text-indigo-600'
                                        }`}
                                        data-testid={`difficulty-status-${d.id}`}
                                      >
                                        <span
                                          className={`h-1.5 w-1.5 rounded-full ${
                                            isCovered ? 'bg-zinc-400' : 'bg-indigo-500'
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
                      <div className="mt-3" data-testid="profile-weaknesses">
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
              </div>
            </div>
          </section>

          {/* Teacher's Working Memory (dark, private teacher space) */}
          {(hasWorkingMemory || showEmptySections) && (
            <section
              className="rounded-2xl p-6 text-white"
              style={{ background: '#1A1B22' }}
              data-testid="profile-teachers-working-memory"
            >
              <h3 className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#C3C0FF] mb-5 flex items-center gap-2">
                Teacher&apos;s Working Memory
              </h3>

              <div className="space-y-6">
                {/* Personal notes (Sensitivities / Life Context) */}
                {(parsedPersonalNotes || student.personalNotes) && (
                  <div>
                    <p className="text-[0.625rem] font-bold uppercase tracking-widest text-white/50 mb-2">
                      Sensitivities / Life Context
                    </p>
                    {parsedPersonalNotes ? (
                      <div className="space-y-2">
                        {parsedPersonalNotes.sections.map((section, i) => (
                          <div key={`pn-${i}-${section.label}`}>
                            {section.label && (
                              <p className="text-xs font-medium text-white/60 mb-0.5">{section.label}</p>
                            )}
                            <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{section.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{student.personalNotes}</p>
                    )}
                  </div>
                )}

                {/* Teaching notes (Pedagogical Observations) */}
                {(parsedTeachingNotes || student.teachingNotes) && (
                  <div className={parsedPersonalNotes || student.personalNotes ? 'pt-4 border-t border-white/10' : ''}>
                    <p className="text-[0.625rem] font-bold uppercase tracking-widest text-white/50 mb-2">
                      Pedagogical Observations
                    </p>
                    {parsedTeachingNotes ? (
                      <div className="space-y-2 border-l-2 border-indigo-400/50 pl-3">
                        {parsedTeachingNotes.sections.map((section, i) => (
                          <div key={`tn-${i}-${section.label}`}>
                            {section.label && (
                              <p className="text-xs font-medium text-white/60 mb-0.5">{section.label}</p>
                            )}
                            <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{section.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed border-l-2 border-indigo-400/50 pl-3">
                        {student.teachingNotes}
                      </p>
                    )}
                  </div>
                )}

                {!student.personalNotes && !student.teachingNotes && (
                  <p className="text-sm text-white/40 italic">No notes added yet</p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ============================================================
            RIGHT COLUMN (4/12)
            ============================================================ */}
        <div className="lg:col-span-4 space-y-6">

          {/* 1. Teacher's Working Memory (always visible, unconditional) */}
          <section
            className="bg-white rounded-xl p-5"
            style={{ boxShadow: '0 2px 12px rgba(26,27,34,0.06)' }}
            data-testid="profile-about"
          >
            <SectionHeader>Teacher&apos;s Working Memory</SectionHeader>
            {hasAbout ? (
              <div>
                {student.profession && <FieldValue label="Profession" value={student.profession} />}
                {student.birthYear != null && (() => {
                  const age = new Date().getFullYear() - student.birthYear!
                  return <FieldValue label="Born" value={`${student.birthYear} (${age})`} />
                })()}
                {origin && <FieldValue label="Origin" value={origin} />}
                {location && <FieldValue label="Residence" value={location} />}
              </div>
            ) : (
              <EmptyState text="No identity details added yet" />
            )}
          </section>

          {/* 2. Language Ecosystem */}
          <section data-testid="profile-language-ecosystem">
            <SectionHeader>Language Ecosystem</SectionHeader>
            <div className="space-y-2">
              {student.nativeLanguages.length > 0 && (
                <div className="flex items-baseline gap-2 py-1">
                  <span className="text-xs text-zinc-400 shrink-0 w-20">Native</span>
                  <div className="flex flex-wrap gap-1.5">
                    {student.nativeLanguages.map((lang) => (
                      <span key={lang} className="inline-flex items-center gap-1 text-sm text-[#1A1B22]">
                        {lang}
                        <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[0.625rem] font-bold uppercase bg-zinc-100 text-zinc-500">
                          {langCode(lang)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {student.spokenLanguages.length > 0 && (
                <div className="flex items-baseline gap-2 py-1">
                  <span className="text-xs text-zinc-400 shrink-0 w-20">Spoken</span>
                  <span className="text-sm text-[#1A1B22]">{student.spokenLanguages.join(', ')}</span>
                </div>
              )}
              <div className="flex items-baseline gap-2 py-1">
                <span className="text-xs text-zinc-400 shrink-0 w-20">Learning</span>
                <span className="text-sm text-[#1A1B22] flex items-center gap-2">
                  {student.learningLanguage}
                  <CefrBadge level={student.cefrLevel} />
                </span>
              </div>
              {student.officialCefrLevel && (
                <div className="flex items-baseline gap-2 py-1">
                  <span className="text-xs text-zinc-400 shrink-0 w-20">Official</span>
                  <span className="text-sm text-[#1A1B22] flex items-center gap-1">
                    <span className="text-xs text-zinc-500">Official:</span>
                    <CefrBadge level={student.officialCefrLevel} />
                  </span>
                </div>
              )}
              {student.nativeLanguages.length === 0 && student.spokenLanguages.length === 0 && (
                <EmptyState text="No native or spoken languages added yet" />
              )}
            </div>
          </section>

          {/* 3. Interests */}
          <InterestsSection key={student.id} student={student} onSave={onSaveInterests} />

          {/* 4. Commercial */}
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

          {/* 5. Ideas para Clases */}
          <section data-testid="profile-teaching-todos">
            <SectionHeader>Ideas para Clases</SectionHeader>
            <TeachingTodosCard
              todos={student.teachingTodos}
              studentId={student.id}
              onStudentChange={onStudentChange}
            />
          </section>

          {/* 6. Pending Followups */}
          <section data-testid="profile-followups">
            <StudentFollowupsCard
              followups={followups}
              studentId={student.id}
              onFollowupChange={onFollowupChange ?? (() => {})}
            />
          </section>
        </div>
      </div>

      {/* Show all sections toggle */}
      {anySectionCollapsed && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setShowEmptySections(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-indigo-600 transition-colors"
            data-testid="show-empty-sections-btn"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Show all sections
          </button>
        </div>
      )}
    </div>
  )
}
