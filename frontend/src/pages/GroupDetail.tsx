import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { getGroup } from '@/api/groups'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { GroupAvatarCluster } from '@/components/GroupAvatarCluster'

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: group, isLoading, isError } = useQuery({
    queryKey: ['group', id],
    queryFn: () => getGroup(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !group) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">Failed to load group.</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/groups')}
          className="text-zinc-500 hover:text-zinc-800 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Groups
        </Button>
      </div>

      <div className="bg-white rounded-xl p-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <GroupAvatarCluster
            size="lg"
            members={group.members ?? group.memberPreview ?? []}
            totalCount={group.memberCount}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-900">{group.name}</h1>
              {group.cefrLevel && <CefrBadge level={group.cefrLevel} />}
            </div>
            <p className="text-sm text-zinc-500">
              {group.memberCount} student{group.memberCount === 1 ? '' : 's'}
            </p>
            {group.description && (
              <p className="text-sm text-zinc-600 mt-1">{group.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/groups/${id}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Group
          </Button>
          <Button
            size="sm"
            className="lt-gradient-primary text-white"
            onClick={() => navigate(`/sessions/new?groupId=${id}`)}
            data-testid="log-session-button"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Log Session
          </Button>
        </div>
      </div>

      {group.teachingIdeas && group.teachingIdeas.length > 0 && (
        <div className="bg-white rounded-xl p-6 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.05em] text-zinc-400">
            Teaching Ideas
          </h2>
          <ul className="space-y-2">
            {group.teachingIdeas.map(idea => (
              <li key={idea.id} className="text-sm text-zinc-700">
                {idea.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
