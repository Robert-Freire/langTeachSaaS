import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, Search, Plus, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'
import {
  type Group,
  getGroup, createGroup, updateGroup, deleteGroup,
  addGroupMember, removeGroupMember,
} from '@/api/groups'
import { getFollowups, createFollowup, updateFollowupStatus, type TeacherFollowup } from '@/api/followups'
import { logger } from '@/lib/logger'
import { getStudents } from '@/api/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageHeader } from '@/components/PageHeader'
import { CEFR_LEVELS, cefrColors } from '@/lib/cefr-colors'
import { getAvatarColor } from '@/lib/avatarColor'
import { getInitials } from '@/utils/nameUtils'
import { cn } from '@/lib/utils'

const MAX_NAME = 100
const MAX_DESC = 500
const MAX_REASON = 500
const MAX_INTERESTS = 50
const MAX_FOCUS_AREAS = 50

interface SelectedMember {
  id: string
  name: string
}

function StudentMemberPicker({
  selected,
  onChange,
}: {
  selected: SelectedMember[]
  onChange: (members: SelectedMember[]) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => getStudents({ pageSize: 200 }),
    staleTime: 60_000,
  })

  const activeStudents = (studentsData?.items ?? []).filter(
    (s) => s.commercial.isActive,
  )

  const selectedIds = new Set(selected.map((m) => m.id))
  const filtered = activeStudents.filter(
    (s) =>
      !selectedIds.has(s.id) &&
      s.name.toLowerCase().includes(search.toLowerCase()),
  )

  function addMember(id: string, name: string) {
    if (selectedIds.has(id)) return
    onChange([...selected, { id, name }])
    setSearch('')
    inputRef.current?.focus()
  }

  function removeMember(id: string) {
    onChange(selected.filter((m) => m.id !== id))
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="member-chips">
          {selected.map((m) => {
            const color = getAvatarColor(m.id)
            return (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium bg-indigo-50 text-indigo-700"
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold',
                    color,
                  )}
                  aria-hidden="true"
                >
                  {getInitials(m.name)}
                </span>
                <span className="text-[#1A1B22]">{m.name}</span>
                <button
                  type="button"
                  onClick={() => removeMember(m.id)}
                  className="ml-0.5 text-zinc-400 hover:text-zinc-700 transition-colors"
                  aria-label={`Remove ${m.name}`}
                  data-testid={`remove-member-${m.id}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {selected.length === 0 && (
        <p className="text-sm italic text-zinc-400">
          Add students to this group. You can do this later if you don't know them all yet.
        </p>
      )}

      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search students..."
            className="pl-9"
            data-testid="member-search-input"
          />
        </div>

        {open && (search.length > 0 || filtered.length > 0) && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-[#C7C4D8]/20 bg-white/80 backdrop-blur-[12px] shadow-[0_12px_40px_rgba(26,27,34,0.06)] max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-zinc-400 italic">No students found</p>
            ) : (
              filtered.slice(0, 20).map((s) => {
                const color = getAvatarColor(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-[#F4F2FD] transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      addMember(s.id, s.name)
                      setOpen(false)
                    }}
                    data-testid={`student-option-${s.id}`}
                  >
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        color,
                      )}
                    >
                      {getInitials(s.name)}
                    </span>
                    <span className="text-[#1A1B22]">{s.name}</span>
                    {s.level?.cefrLevel && (
                      <span
                        className={cn(
                          'ml-auto rounded px-1.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.05em]',
                          cefrColors(s.level.cefrLevel),
                        )}
                      >
                        {s.level.cefrLevel}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Outer shell: handles query loading/error, then mounts the form body with stable initial values.
// Splitting avoids setState-in-effect: inner component initializes state from props, not from an effect.
export default function GroupForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const { data: group, isLoading: loadingGroup, isError: groupError } = useQuery({
    queryKey: ['group', id],
    queryFn: () => getGroup(id!),
    enabled: isEdit,
  })

  if (isEdit && loadingGroup) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (isEdit && (groupError || (!loadingGroup && !group))) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">
          Group not found.{' '}
          <button onClick={() => navigate('/groups')} className="underline hover:text-zinc-700 transition-colors">
            Go back
          </button>
        </span>
      </div>
    )
  }

  // key resets inner state when navigating between create and edit, or between different groups
  return <GroupFormBody key={group?.id ?? 'new'} group={group} />
}

function GroupFormBody({ group }: { group?: Group }) {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const existingMembers = (group?.members ?? []).map((m) => ({ id: m.id, name: m.name }))

  const [name, setName] = useState(group?.name ?? '')
  const [cefrLevel, setCefrLevel] = useState(group?.cefrLevel ?? '')
  const [description, setDescription] = useState(group?.description ?? '')
  const [reasonForStudying, setReasonForStudying] = useState(group?.reasonForStudying ?? '')
  const [interests, setInterests] = useState<string[]>(() => {
    try { return JSON.parse(group?.interests ?? '[]') } catch { return [] }
  })
  const [interestInput, setInterestInput] = useState('')
  const [focusAreas, setFocusAreas] = useState<string[]>(() => {
    try { return JSON.parse(group?.commonFocusAreas ?? '[]') } catch { return [] }
  })
  const [focusAreaInput, setFocusAreaInput] = useState('')
  const interestInputRef = useRef<HTMLInputElement>(null)
  const focusAreaInputRef = useRef<HTMLInputElement>(null)
  const [members, setMembers] = useState<SelectedMember[]>(existingMembers)
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [originalMemberIds] = useState(() => existingMembers.map((m) => m.id))
  // Tracks a group created mid-save so retries reuse it instead of creating a duplicate
  const pendingGroupIdRef = useRef<string | null>(null)

  // Class goals (only in edit mode, saved immediately via API)
  const { data: goals = [], refetch: refetchGoals } = useQuery({
    queryKey: ['group-goals', id],
    queryFn: () => getFollowups({ groupId: id!, kind: 'objective' }),
    enabled: isEdit && !!id,
  })
  const [goalText, setGoalText] = useState('')
  const [goalDueDate, setGoalDueDate] = useState('')

  const addGoalMutation = useMutation({
    mutationFn: () => createFollowup({
      text: goalText.trim(),
      groupId: id!,
      kind: 'objective',
      dueDate: goalDueDate || null,
    }),
    onSuccess: () => {
      setGoalText('')
      setGoalDueDate('')
      refetchGoals()
    },
    onError: () => toast.error('Could not add goal. Please try again.'),
  })

  const toggleGoalMutation = useMutation({
    mutationFn: (g: TeacherFollowup) =>
      updateFollowupStatus(g.id, g.status === 'pending' ? 'done' : 'pending'),
    onSuccess: () => refetchGoals(),
    onError: () => toast.error('Could not update goal.'),
  })

  function addInterest(value: string) {
    const trimmed = value.trim()
    if (trimmed && !interests.includes(trimmed) && interests.length < MAX_INTERESTS) {
      setInterests([...interests, trimmed])
    }
    setInterestInput('')
  }

  function removeInterest(item: string) {
    setInterests(interests.filter((i) => i !== item))
  }

  function handleInterestKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addInterest(interestInput)
    } else if (e.key === 'Backspace' && interestInput === '' && interests.length > 0) {
      setInterests(interests.slice(0, -1))
    }
  }

  function addFocusArea(value: string) {
    const trimmed = value.trim()
    if (trimmed && !focusAreas.includes(trimmed) && focusAreas.length < MAX_FOCUS_AREAS) {
      setFocusAreas([...focusAreas, trimmed])
    }
    setFocusAreaInput('')
  }

  function removeFocusArea(item: string) {
    setFocusAreas(focusAreas.filter((f) => f !== item))
  }

  function handleFocusAreaKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addFocusArea(focusAreaInput)
    } else if (e.key === 'Backspace' && focusAreaInput === '' && focusAreas.length > 0) {
      setFocusAreas(focusAreas.slice(0, -1))
    }
  }

  const { mutate: doSave, isPending: saving } = useMutation({
    mutationFn: async () => {
      const selectedIds = members.map((m) => m.id)
      const finalInterests = interestInput.trim()
        ? [...interests, interestInput.trim()]
        : interests
      const finalFocusAreas = focusAreaInput.trim()
        ? [...focusAreas, focusAreaInput.trim()]
        : focusAreas

      if (isEdit && id) {
        await updateGroup(id, {
          name: name.trim(),
          cefrLevel: cefrLevel || null,
          description: description.trim() || null,
          isActive: group?.isActive ?? true,
          reasonForStudying: reasonForStudying.trim() || null,
          interests: JSON.stringify(finalInterests),
          commonFocusAreas: JSON.stringify(finalFocusAreas),
        })
        const toAdd = selectedIds.filter((sid) => !originalMemberIds.includes(sid))
        const toRemove = originalMemberIds.filter((oid) => !selectedIds.includes(oid))
        for (const sid of toAdd) await addGroupMember(id, sid)
        for (const oid of toRemove) await removeGroupMember(id, oid)
      } else {
        const groupId = pendingGroupIdRef.current ?? (await createGroup({
          name: name.trim(),
          cefrLevel: cefrLevel || null,
          description: description.trim() || null,
          isActive: true,
          reasonForStudying: reasonForStudying.trim() || null,
          interests: JSON.stringify(finalInterests),
          commonFocusAreas: JSON.stringify(finalFocusAreas),
        })).id
        pendingGroupIdRef.current = groupId
        for (const sid of selectedIds) await addGroupMember(groupId, sid)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      navigate('/groups')
    },
    onError: (err) => {
      logger.error('GroupForm', 'save failed', err)
      setSubmitError('Something went wrong. Please try again.')
    },
  })

  const { mutate: doDelete, isPending: deleting } = useMutation({
    mutationFn: () => deleteGroup(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Group deleted')
      setShowDeleteDialog(false)
      navigate('/groups')
    },
    onError: (err) => {
      logger.error('GroupForm', 'delete failed', err)
      toast.error('Could not delete the group. Please try again.')
      setShowDeleteDialog(false)
    },
  })

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setNameError('')
    setSubmitError('')
    if (!name.trim()) {
      setNameError('Group name is required.')
      return
    }
    doSave()
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Group' : 'New Group'}
        subtitle={isEdit ? group?.name : 'Set up a new class group'}
      />

      <Card className="rounded-2xl border-0 bg-white shadow-[0_12px_40px_rgba(26,27,34,0.06)]">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSave} noValidate className="space-y-6">
            {submitError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {submitError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="group-name" className="text-sm font-medium text-[#1A1B22]">
                Name <span className="text-red-500" aria-hidden>*</span>
              </Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError('')
                }}
                placeholder="e.g. Lunes B1"
                maxLength={MAX_NAME}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? 'name-error' : undefined}
                data-testid="group-name-input"
              />
              {nameError && (
                <p id="name-error" className="text-sm text-red-600" role="alert">
                  {nameError}
                </p>
              )}
              {name.length > MAX_NAME * 0.85 && (
                <p className="text-xs text-zinc-400 text-right">
                  {name.length}/{MAX_NAME}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="group-cefr" className="text-sm font-medium text-[#1A1B22]">
                CEFR Level
              </Label>
              <Select
                value={cefrLevel || undefined}
                onValueChange={(v) => setCefrLevel(v == null || v === 'none' ? '' : v)}
              >
                <SelectTrigger id="group-cefr" data-testid="group-cefr-select">
                  <SelectValue placeholder="Select level…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-zinc-400 italic">None</span>
                  </SelectItem>
                  {CEFR_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      <span
                        className={cn(
                          'inline-block rounded px-1.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.05em] mr-2',
                          cefrColors(level),
                        )}
                      >
                        {level}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="group-description" className="text-sm font-medium text-[#1A1B22]">
                Description
              </Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kind of class is this? Where, when, who?"
                maxLength={MAX_DESC}
                rows={3}
                className="italic placeholder:not-italic"
                data-testid="group-description-input"
              />
              {description.length > MAX_DESC * 0.85 && (
                <p className="text-xs text-zinc-400 text-right">
                  {description.length}/{MAX_DESC}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="group-reason" className="text-sm font-medium text-[#1A1B22]">
                Class Purpose
              </Label>
              <Textarea
                id="group-reason"
                value={reasonForStudying}
                onChange={(e) => setReasonForStudying(e.target.value)}
                placeholder="e.g. DELE B2 exam prep, conversational fluency for work..."
                maxLength={MAX_REASON}
                rows={2}
                className="italic placeholder:not-italic"
                data-testid="group-reason-input"
              />
              {reasonForStudying.length > MAX_REASON * 0.85 && (
                <p className="text-xs text-zinc-400 text-right">
                  {reasonForStudying.length}/{MAX_REASON}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#1A1B22]">Interests</Label>
              <div
                className="flex flex-wrap gap-1.5 min-h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 cursor-text"
                onClick={() => interestInputRef.current?.focus()}
              >
                {interests.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full px-2.5 py-0.5"
                    data-testid="interest-chip"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeInterest(item) }}
                      className="text-indigo-400 hover:text-indigo-700 p-0.5 -mr-0.5"
                      aria-label={`Remove ${item}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <input
                  ref={interestInputRef}
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={handleInterestKeyDown}
                  onBlur={() => { if (interestInput.trim()) addInterest(interestInput) }}
                  placeholder={interests.length === 0 ? 'Type and press Enter…' : ''}
                  className="flex-1 min-w-24 outline-none text-sm bg-transparent placeholder:text-zinc-400"
                  data-testid="interest-input"
                />
              </div>
              <p className="text-xs text-zinc-400">Press Enter or comma to add. Backspace to remove last.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#1A1B22]">Common Focus Areas</Label>
              <p className="text-xs text-zinc-400 -mt-0.5">Shared error patterns or remedial priorities for this class.</p>
              <div
                className="flex flex-wrap gap-1.5 min-h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 cursor-text"
                onClick={() => focusAreaInputRef.current?.focus()}
              >
                {focusAreas.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full px-2.5 py-0.5"
                    data-testid="focus-area-chip"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFocusArea(item) }}
                      className="text-amber-400 hover:text-amber-700 p-0.5 -mr-0.5"
                      aria-label={`Remove ${item}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <input
                  ref={focusAreaInputRef}
                  value={focusAreaInput}
                  onChange={(e) => setFocusAreaInput(e.target.value)}
                  onKeyDown={handleFocusAreaKeyDown}
                  onBlur={() => { if (focusAreaInput.trim()) addFocusArea(focusAreaInput) }}
                  placeholder={focusAreas.length === 0 ? 'Type and press Enter…' : ''}
                  className="flex-1 min-w-24 outline-none text-sm bg-transparent placeholder:text-zinc-400"
                  data-testid="focus-area-input"
                />
              </div>
              <p className="text-xs text-zinc-400">Press Enter or comma to add. Backspace to remove last.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#1A1B22]">Members</Label>
              <StudentMemberPicker selected={members} onChange={setMembers} />
            </div>

            {isEdit && (
              <div className="space-y-3 border-t border-zinc-100 pt-4">
                <div>
                  <Label className="text-sm font-medium text-[#1A1B22]">Class Teaching Goals</Label>
                  <p className="text-xs text-zinc-400 mt-0.5">Long-term objectives for this class. Saved immediately.</p>
                </div>
                <div className="space-y-2">
                  {goals.length === 0 && (
                    <p className="text-xs text-zinc-400 italic" data-testid="goals-empty">No teaching goals yet.</p>
                  )}
                  {goals.map((g) => (
                    <div key={g.id} className="flex items-start gap-2 group">
                      <button
                        type="button"
                        onClick={() => !toggleGoalMutation.isPending && toggleGoalMutation.mutate(g)}
                        className="mt-0.5 shrink-0 text-zinc-400 hover:text-emerald-600 transition-colors"
                        aria-label={g.status === 'done' ? 'Mark pending' : 'Mark done'}
                        data-testid={`goal-toggle-${g.id}`}
                      >
                        {g.status === 'done'
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <Circle className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', g.status === 'done' && 'line-through text-zinc-400')} data-testid={`goal-text-${g.id}`}>{g.text}</p>
                        {g.dueDate && (
                          <p className="text-xs text-zinc-400">Due {g.dueDate}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Input
                      value={goalText}
                      onChange={(e) => setGoalText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); if (goalText.trim()) addGoalMutation.mutate() }
                      }}
                      placeholder="Add a teaching goal…"
                      maxLength={500}
                      className="text-sm"
                      data-testid="goal-text-input"
                      disabled={addGoalMutation.isPending}
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      type="date"
                      value={goalDueDate}
                      onChange={(e) => setGoalDueDate(e.target.value)}
                      className="text-sm w-38"
                      data-testid="goal-due-date-input"
                      aria-label="Due date"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { if (goalText.trim()) addGoalMutation.mutate() }}
                    disabled={addGoalMutation.isPending || !goalText.trim()}
                    data-testid="goal-add-btn"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/groups')}
                className="text-zinc-500 hover:text-zinc-700"
                data-testid="cancel-link"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="lt-gradient-primary text-white px-6"
                data-testid="save-button"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  isEdit ? 'Save changes' : 'Create group'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isEdit && (
        <div className="pt-2">
          <Button
            type="button"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
            onClick={() => setShowDeleteDialog(true)}
            data-testid="delete-group-button"
          >
            Delete group
          </Button>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the group. Sessions and student records will not be affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => doDelete()}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
              data-testid="confirm-delete-button"
            >
              {deleting ? 'Deleting...' : 'Delete group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
