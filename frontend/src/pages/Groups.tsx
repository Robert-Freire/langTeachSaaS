import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, UserPlus, UsersRound, ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { getGroups, type Group } from '../api/groups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CEFR_LEVELS } from '@/lib/cefr-colors'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { GroupAvatarCluster } from '@/components/GroupAvatarCluster'
import { cn } from '@/lib/utils'
import { formatRelativeDate } from '@/utils/formatRelativeDate'

const CEFR_FILTER_OPTIONS = ['All', ...CEFR_LEVELS] as const
const PAGE_SIZE = 12

const COL_CLASSES = 'grid-cols-[minmax(140px,2fr)_80px_minmax(180px,1.5fr)_110px_130px_1fr]'
const TABLE_HEADERS = ['NAME', 'CEFR LEVEL', 'MEMBERS', 'LAST SESSION', 'NEXT SESSION', 'SIGNALS'] as const

export default function Groups() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const cefrFilter = searchParams.get('level') ?? 'All'
  const visibleCount = Number(searchParams.get('count') ?? PAGE_SIZE)

  const qFromUrl = searchParams.get('q') ?? ''
  const [localSearch, setLocalSearch] = useState(() => qFromUrl)
  const didInitSearchRef = useRef(false)
  const lastWrittenSearchRef = useRef(qFromUrl)

  useEffect(() => {
    setLocalSearch(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    if (!didInitSearchRef.current) {
      didInitSearchRef.current = true
      return
    }
    const timer = setTimeout(() => {
      const searchChanged = localSearch !== lastWrittenSearchRef.current
      lastWrittenSearchRef.current = localSearch
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (localSearch) { next.set('q', localSearch) } else { next.delete('q') }
        if (searchChanged) next.delete('count')
        return next
      }, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, setSearchParams])

  function updateParam(updates: Record<string, string | null>) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || value === 'All' || (key === 'count' && value === String(PAGE_SIZE))) {
          next.delete(key)
        } else {
          next.set(key, value)
        }
      }
      return next
    }, { replace: true })
  }

  const {
    data: groupsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['groups'],
    queryFn: () => getGroups({ pageSize: 100 }),
  })

  const allGroups: Group[] = groupsData?.items ?? []

  const filteredGroups = allGroups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(localSearch.toLowerCase())
    const matchesCefr = cefrFilter === 'All' || g.cefrLevel === cefrFilter
    return matchesSearch && matchesCefr
  })

  const visibleGroups = filteredGroups.slice(0, visibleCount)

  function buildSubtitle(): string {
    const total = allGroups.length
    if (localSearch) {
      const count = filteredGroups.length
      return `Showing ${count} result${count === 1 ? '' : 's'} for '${localSearch}'`
    }
    if (cefrFilter !== 'All') {
      const count = allGroups.filter(g => g.cefrLevel === cefrFilter).length
      return `Showing ${count} ${cefrFilter} group${count === 1 ? '' : 's'}`
    }
    return `Your academy classes, ${total} active`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="bg-white rounded-xl overflow-hidden">
          <div className={cn('grid gap-4 px-4 py-2', COL_CLASSES)}>
            {TABLE_HEADERS.map((_h, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className={cn('grid gap-4 px-4 py-3', COL_CLASSES)}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-10 rounded-md" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">Failed to load groups. Please try again.</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Groups"
        subtitle={allGroups.length > 0 ? buildSubtitle() : undefined}
        actions={
          <Button
            onClick={() => navigate('/groups/new')}
            className="lt-gradient-primary text-white"
            data-testid="add-group-button"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Group
          </Button>
        }
      />

      {allGroups.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Search groups..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-white border-zinc-200 focus-visible:ring-indigo-500"
              data-testid="groups-search"
            />
          </div>

          <div className="flex items-center gap-1">
            {CEFR_FILTER_OPTIONS.map(level => (
              <button
                key={level}
                onClick={() => updateParam({ level: level === 'All' ? null : level, count: null })}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  cefrFilter === level
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100',
                )}
                data-testid={`cefr-pill-${level}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {allGroups.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          data-testid="groups-empty-state"
        >
          <UsersRound className="h-12 w-12 text-indigo-200 mb-4" strokeWidth={1.25} />
          <h2 className="text-lg font-medium text-zinc-700 mb-1">No groups yet</h2>
          <p className="text-sm text-zinc-500">Add a group to log sessions with an academy class.</p>
        </div>
      )}

      {allGroups.length > 0 && (
        <div className="bg-white rounded-xl overflow-hidden">
          <div className={cn('grid gap-x-4 px-4 py-2.5', COL_CLASSES)}>
            {TABLE_HEADERS.map((h, i) => (
              <span
                key={i}
                className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400"
              >
                {h}
              </span>
            ))}
          </div>

          {filteredGroups.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">
              No groups match your search.
            </div>
          ) : (
            <div className="px-2 pb-2 space-y-0.5">
              {visibleGroups.map(group => (
                <div
                  key={group.id}
                  data-testid={`group-row-${group.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/groups/${group.id}`) } }}
                  className={cn(
                    'grid gap-x-4 items-center px-2 py-2 rounded-lg cursor-pointer hover:bg-[#F4F2FD] transition-colors',
                    COL_CLASSES,
                  )}
                >
                  <span data-testid="group-name" className="text-sm font-medium text-zinc-900 truncate">
                    {group.name}
                  </span>

                  {group.cefrLevel ? (
                    <CefrBadge level={group.cefrLevel} data-testid="group-level" />
                  ) : (
                    <span className="text-zinc-300 text-sm">—</span>
                  )}

                  <div className="flex flex-col gap-1">
                    <GroupAvatarCluster
                      size="sm"
                      members={group.memberPreview ?? []}
                      totalCount={group.memberCount}
                    />
                    <span className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">
                      {group.memberCount} student{group.memberCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <span className="text-sm text-zinc-500">
                    {formatRelativeDate(group.lastSessionDate)}
                  </span>

                  <span className="text-sm text-zinc-500">
                    {formatRelativeDate(group.nextSessionDate, true)}
                  </span>

                  <ChevronRight className="h-4 w-4 text-zinc-300 justify-self-end" />
                </div>
              ))}
            </div>
          )}

          {filteredGroups.length > 0 && (
            <div className="px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center">
              <span className="text-xs text-zinc-400">
                Showing {Math.min(visibleCount, filteredGroups.length)} of {filteredGroups.length} group{filteredGroups.length === 1 ? '' : 's'}
              </span>
              {visibleCount < filteredGroups.length ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateParam({ count: String(visibleCount + PAGE_SIZE) })}
                  data-testid="groups-load-more"
                >
                  Load more
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : <span />}
              <span />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
