import { useEffect, useRef, useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import type { GroupMemberSummary } from '@/api/groups'
import { removeGroupMember } from '@/api/groups'
import { AddMemberModal } from '@/components/group/AddMemberModal'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { Button } from '@/components/ui/button'
import { getAvatarColor } from '@/lib/avatarColor'
import { getInitials } from '@/utils/nameUtils'
import { cn } from '@/lib/utils'

interface Props {
  groupId: string
  members: GroupMemberSummary[]
  onGroupChange: () => void
}

export function GroupMembersTab({ groupId, members, onGroupChange }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [removedToast, setRemovedToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  const removeMutation = useMutation({
    mutationFn: (studentId: string) => removeGroupMember(groupId, studentId),
    onSuccess: (_, studentId) => {
      const removed = members.find(m => m.id === studentId)
      setRemoveError(null)
      onGroupChange()
      if (removed) {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setRemovedToast(`${removed.name} removed from group`)
        toastTimerRef.current = setTimeout(() => setRemovedToast(null), 3000)
      }
    },
    onError: () => {
      setRemoveError('Could not remove member. Please try again.')
    },
  })

  const existingMemberIds = new Set(members.map(m => m.id))

  return (
    <div data-testid="group-members-tab">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-manrope text-[#1A1B22]">Members ({members.length})</h2>
        <Button
          onClick={() => setShowAddModal(true)}
          className="gap-1.5"
          data-testid="add-member-btn"
        >
          <UserPlus className="h-4 w-4" />
          Add member
        </Button>
      </div>

      {removeError && (
        <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700" data-testid="remove-error">
          {removeError}
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-center py-12" data-testid="members-empty-state">
          <p className="text-zinc-500 text-sm">No members yet.</p>
          <p className="text-zinc-400 text-xs mt-1">Add students to this group using the button above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}>
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-2 border-b border-zinc-100">
            <div />
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-zinc-400">Name</span>
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-zinc-400">Level</span>
            <div />
          </div>
          {members.map(member => {
            const initials = getInitials(member.name)
            return (
              <div
                key={member.id}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-3 border-b border-zinc-50 last:border-0 hover:bg-[#F4F2FD] group transition-colors"
                data-testid="member-row"
              >
                <div
                  className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', getAvatarColor(member.id))}
                >
                  {initials}
                </div>
                <Link
                  to={`/students/${member.id}`}
                  className="font-medium text-sm text-[#1A1B22] hover:text-indigo-700 truncate transition-colors"
                  data-testid={`member-name-${member.id}`}
                >
                  {member.name}
                </Link>
                <div>
                  {member.cefrLevel ? (
                    <CefrBadge level={member.cefrLevel}  />
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => !removeMutation.isPending && removeMutation.mutate(member.id)}
                  disabled={removeMutation.isPending}
                  className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all p-1 rounded"
                  aria-label={`Remove ${member.name}`}
                  data-testid={`remove-member-${member.id}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showAddModal && (
        <AddMemberModal
          groupId={groupId}
          existingMemberIds={existingMemberIds}
          onClose={() => setShowAddModal(false)}
          onMemberAdded={onGroupChange}
        />
      )}

      {removedToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1B22] text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2"
          data-testid="remove-toast"
        >
          {removedToast}
        </div>
      )}
    </div>
  )
}
