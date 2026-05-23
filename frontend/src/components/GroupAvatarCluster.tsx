import { cn } from '@/lib/utils'
import { getAvatarColor } from '@/lib/avatarColor'
import { getInitials } from '@/utils/nameUtils'

export interface GroupAvatarMember {
  id: string
  name: string
}

interface GroupAvatarClusterProps {
  size?: 'sm' | 'md' | 'lg'
  members: GroupAvatarMember[]
  totalCount: number
  className?: string
}

const TILE_CLASS: Record<NonNullable<GroupAvatarClusterProps['size']>, string> = {
  sm: 'w-6 h-6 text-[0.625rem]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
}

// sm/md overlap horizontally. lg uses a 2x2 grid.
export function GroupAvatarCluster({
  size = 'sm',
  members,
  totalCount,
  className,
}: GroupAvatarClusterProps) {
  const isGrid = size === 'lg'
  const maxVisible = isGrid ? 4 : 3
  const visible = members.slice(0, maxVisible)
  const overflow = totalCount - maxVisible
  const tileCls = TILE_CLASS[size]
  const ariaNames = visible.map(m => m.name).join(', ')
  const ariaLabel = `${totalCount} member${totalCount === 1 ? '' : 's'}${ariaNames ? `: ${ariaNames}` : ''}`

  if (isGrid) {
    const slots = [...visible]
    while (slots.length < 4 && slots.length < totalCount) slots.push(null as unknown as GroupAvatarMember)
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        data-testid="group-avatar-cluster"
        className={cn('grid grid-cols-2 gap-0.5', className)}
      >
        {Array.from({ length: 4 }).map((_, i) => {
          const showOverflow = overflow > 0 && i === 3
          const m = !showOverflow ? visible[i] : null
          if (showOverflow) {
            return (
              <div
                key="overflow"
                data-testid="group-avatar-overflow"
                className={cn(
                  'rounded-md flex items-center justify-center font-semibold bg-zinc-100 text-zinc-600',
                  tileCls,
                )}
              >
                +{overflow}
              </div>
            )
          }
          if (!m) {
            return <div key={`slot-${i}`} className={cn('rounded-md bg-zinc-50', tileCls)} />
          }
          return (
            <div
              key={m.id}
              data-testid="group-avatar-tile"
              className={cn(
                'rounded-md flex items-center justify-center font-semibold',
                tileCls,
                getAvatarColor(m.id),
              )}
            >
              {getInitials(m.name)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      data-testid="group-avatar-cluster"
      className={cn('flex items-center', className)}
    >
      {visible.map((m, i) => (
        <div
          key={m.id}
          data-testid="group-avatar-tile"
          className={cn(
            'rounded-full flex items-center justify-center font-semibold ring-2 ring-white',
            tileCls,
            getAvatarColor(m.id),
            i > 0 && '-ml-2',
          )}
        >
          {getInitials(m.name)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          data-testid="group-avatar-overflow"
          className={cn(
            'rounded-full flex items-center justify-center font-semibold bg-zinc-100 text-zinc-600 ring-2 ring-white -ml-2',
            tileCls,
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
