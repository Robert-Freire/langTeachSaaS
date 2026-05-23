import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getStudents } from '@/api/students'
import { addGroupMember } from '@/api/groups'
import { getAvatarColor } from '@/lib/avatarColor'
import { getInitials } from '@/utils/nameUtils'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { cn } from '@/lib/utils'

interface Props {
  groupId: string
  existingMemberIds: Set<string>
  onClose: () => void
  onMemberAdded: () => void
}

export function AddMemberModal({ groupId, existingMemberIds, onClose, onMemberAdded }: Props) {
  const [search, setSearch] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const { data: studentsData } = useQuery({
    queryKey: ['students-for-add-member'],
    queryFn: () => getStudents({ pageSize: 100 }),
  })

  const addMutation = useMutation({
    mutationFn: (studentId: string) => addGroupMember(groupId, studentId),
    onSuccess: () => {
      setAddError(null)
      onMemberAdded()
      onClose()
    },
    onError: () => {
      setAddError('Could not add member. Please try again.')
    },
  })

  const allStudents = studentsData?.items ?? []
  const filtered = allStudents.filter(s => {
    if (existingMemberIds.has(s.id)) return false
    if (!search.trim()) return true
    return s.name.toLowerCase().includes(search.toLowerCase())
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      data-testid="add-member-modal"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-bold font-manrope text-[#1A1B22]">Add Member</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-zinc-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
              data-testid="member-search-input"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto px-3 py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-400 italic py-4 text-center">
              {search ? 'No students match' : 'All your students are already in this group'}
            </p>
          ) : (
            filtered.map(student => {
              const initials = getInitials(student.name)
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => !addMutation.isPending && addMutation.mutate(student.id)}
                  disabled={addMutation.isPending}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F4F2FD] text-left transition-colors"
                  data-testid={`add-member-option-${student.id}`}
                >
                  <div
                    className={cn('shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', getAvatarColor(student.id))}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1B22] truncate">{student.name}</p>
                  </div>
                  {student.level?.cefrLevel && (
                    <CefrBadge level={student.level.cefrLevel}  />
                  )}
                </button>
              )
            })
          )}
        </div>

        {addError && (
          <div className="px-6 py-2">
            <p className="text-sm text-red-600">{addError}</p>
          </div>
        )}
      </div>
    </div>
  )
}
