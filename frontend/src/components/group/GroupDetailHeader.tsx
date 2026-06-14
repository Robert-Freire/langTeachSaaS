import { Link } from 'react-router-dom'
import { NotebookPen, Pencil, Users } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { GroupAvatarCluster } from '@/components/GroupAvatarCluster'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EntityDetailHeader } from '@/components/common/EntityDetailHeader'
import { cn } from '@/lib/utils'
import type { Group } from '@/api/groups'

interface GroupDetailHeaderProps {
  group: Group
  sessionFrequency: string | null
}

function buildSubtitle(group: Group): string {
  const base = `${group.cefrLevel ? `${group.cefrLevel} group` : 'Group'}, ${group.memberCount} student${group.memberCount === 1 ? '' : 's'}`
  if (group.description && group.description.length <= 60) {
    return `${base}, ${group.description}`
  }
  return base
}

export function GroupDetailHeader({ group, sessionFrequency }: GroupDetailHeaderProps) {
  const memberPreview = (group.memberPreview ?? group.members ?? []).slice(0, 4)

  const avatar = memberPreview.length > 0 ? (
    <GroupAvatarCluster
      size="lg"
      members={memberPreview}
      totalCount={group.memberCount}
      className="shrink-0"
    />
  ) : (
    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center shrink-0">
      <Users className="h-7 w-7 text-zinc-400" />
    </div>
  )

  const badges = group.isActive ? (
    <StatusBadge variant="active" data-testid="active-pill" />
  ) : undefined

  const meta = sessionFrequency ? (
    <span className="text-xs text-zinc-400 mt-1 block" data-testid="cadence-text">
      {sessionFrequency}
    </span>
  ) : undefined

  const actions = (
    <>
      <Link
        to={`/groups/${group.id}/edit`}
        className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
        data-testid="edit-group-btn"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit Group
      </Link>
      <Link
        to={`/groups/${group.id}/log-session`}
        className={cn(buttonVariants({ variant: 'default' }), 'gap-1.5')}
        data-testid="log-session-btn"
      >
        <NotebookPen className="h-3.5 w-3.5" />
        Log Session
      </Link>
    </>
  )

  return (
    <EntityDetailHeader
      backTo="/groups"
      backLabel="Back to groups"
      avatar={avatar}
      title={group.name}
      titleTestId="group-name"
      cefrBadge={group.cefrLevel ? <CefrBadge level={group.cefrLevel} /> : undefined}
      subtitle={buildSubtitle(group)}
      badges={badges}
      meta={meta}
      actions={actions}
      data-testid="group-detail-header"
    />
  )
}
