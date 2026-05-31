import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { getGroup, getGroupSessions } from '@/api/groups'
import { getFollowups } from '@/api/followups'
import { GroupDetailHeader } from '@/components/group/GroupDetailHeader'
import { GroupOverviewTab } from '@/components/group/GroupOverviewTab'
import { GroupMembersTab } from '@/components/group/GroupMembersTab'
import { GroupSessionsTab } from '@/components/group/GroupSessionsTab'
import { calcSessionFrequency } from '@/utils/sessionFrequency'
import { PillTabs } from '@/components/common/PillTabs'

const TABS = ['overview', 'members', 'sessions'] as const
type Tab = typeof TABS[number]

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  members: 'Members',
  sessions: 'Sessions',
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') ?? 'overview'
  const activeTab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'overview'

  function setTab(tab: Tab) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    }, { replace: true })
  }

  const { data: group, isLoading, isError, refetch: refetchGroup } = useQuery({
    queryKey: ['group', id],
    queryFn: () => getGroup(id!),
    enabled: !!id,
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['group-sessions', id],
    queryFn: () => getGroupSessions(id!),
    enabled: !!id,
  })

  const { data: followups = [], refetch: refetchFollowups } = useQuery({
    queryKey: ['group-followups', id],
    queryFn: () => getFollowups({ groupId: id!, kind: 'operational' }),
    enabled: !!id,
  })

  const { data: teachingIdeas = [], refetch: refetchIdeas } = useQuery({
    queryKey: ['group-ideas', id],
    queryFn: () => getFollowups({ groupId: id!, kind: 'pedagogical' }),
    enabled: !!id,
  })

  function onGroupChange() {
    refetchGroup()
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  }

  const sessionFrequency = calcSessionFrequency(sessions)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="group-detail-loading">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (isError || !group) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="group-detail-error">
        <p className="text-zinc-500">Group not found or could not be loaded.</p>
      </div>
    )
  }

  const members = group.members ?? []

  return (
    <div className="min-h-screen" data-testid="group-detail-page">
      <GroupDetailHeader group={group} sessionFrequency={sessionFrequency} />

      {/* Tab bar */}
      <div className="mt-4">
        <PillTabs
          tabs={TABS.map(t => ({ key: t, label: TAB_LABELS[t] }))}
          activeTab={activeTab}
          onTabChange={tab => setTab(tab as Tab)}
        />
      </div>

      {/* Tab content */}
      <div className="py-4">
        {activeTab === 'overview' && (
          <GroupOverviewTab
            group={group}
            sessions={sessions}
            followups={followups}
            teachingIdeas={teachingIdeas}
            onRefetchFollowups={refetchFollowups}
            onRefetchIdeas={refetchIdeas}
            onGroupChange={onGroupChange}
            onViewAllMembers={() => setTab('members')}
            onViewAllSessions={() => setTab('sessions')}
          />
        )}

        {activeTab === 'members' && (
          <GroupMembersTab
            groupId={id!}
            members={members}
            onGroupChange={onGroupChange}
          />
        )}

        {activeTab === 'sessions' && (
          <GroupSessionsTab
            groupId={id!}
            sessions={sessions}
          />
        )}
      </div>
    </div>
  )
}
