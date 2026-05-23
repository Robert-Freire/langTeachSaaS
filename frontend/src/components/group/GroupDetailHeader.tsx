import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil, NotebookPen } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { GroupAvatarCluster } from '@/components/GroupAvatarCluster'
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

  return (
    <div className="bg-white border-b border-zinc-100 px-6 py-5">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/groups"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 mb-4"
          data-testid="back-to-groups"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Groups
        </Link>

        <div className="flex items-start gap-5">
          <GroupAvatarCluster
            size="lg"
            members={memberPreview}
            totalCount={group.memberCount}
            className="shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-manrope text-[#1A1B22] truncate" data-testid="group-name">
                {group.name}
              </h1>
              {group.cefrLevel && (
                <CefrBadge level={group.cefrLevel}  />
              )}
            </div>

            <p className="text-sm text-zinc-500 mt-0.5" data-testid="group-subtitle">
              {buildSubtitle(group)}
            </p>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {group.isActive && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-700" data-testid="active-pill">
                  Active
                </span>
              )}
              {sessionFrequency && (
                <span className="text-xs text-zinc-400" data-testid="cadence-text">
                  {sessionFrequency}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
          </div>
        </div>
      </div>
    </div>
  )
}
