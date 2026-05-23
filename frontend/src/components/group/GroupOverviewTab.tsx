import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Group, GroupSession } from '@/api/groups'
import type { TeacherFollowup } from '@/api/followups'
import { StudentFollowupsCard } from '@/components/student/StudentFollowupsCard'
import { GroupTeachingIdeasCard } from '@/components/group/GroupTeachingIdeasCard'
import { GroupTeachingNotesPanel } from '@/components/group/GroupTeachingNotesPanel'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { getAvatarColor } from '@/lib/avatarColor'
import { getInitials } from '@/utils/nameUtils'
import { cn } from '@/lib/utils'
import type { GroupMemberSummary } from '@/api/groups'

interface Props {
  group: Group
  sessions: GroupSession[]
  followups: TeacherFollowup[]
  teachingIdeas: TeacherFollowup[]
  onRefetchFollowups: () => void
  onRefetchIdeas: () => void
  onGroupChange: () => void
  onViewAllMembers: () => void
  onViewAllSessions: () => void
}

function CalendarBlock({ dateStr, isMostRecent }: { dateStr: string; isMostRecent: boolean }) {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  return (
    <div
      className={`shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center ${isMostRecent ? 'bg-indigo-100' : 'bg-zinc-100'}`}
      aria-label={dateStr}
    >
      <span className={`text-base font-bold leading-none ${isMostRecent ? 'text-indigo-700' : 'text-zinc-600'}`}>{day}</span>
      <span className={`text-[9px] font-bold tracking-wide leading-none mt-0.5 ${isMostRecent ? 'text-indigo-500' : 'text-zinc-400'}`}>{month}</span>
    </div>
  )
}

function GroupProfileCard({ group }: { group: Group }) {
  return (
    <div className="bg-[#F4F2FD] rounded-2xl p-6 flex flex-col gap-3" data-testid="group-profile-card">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-zinc-400 mb-3">Group Profile</h3>
        <div className="flex items-center gap-2 mb-2">
          {group.cefrLevel && <CefrBadge level={group.cefrLevel}  />}
          <span className="text-sm font-semibold text-[#1A1B22]">{group.memberCount} student{group.memberCount === 1 ? '' : 's'}</span>
        </div>
        {group.description ? (
          <p className="text-sm text-zinc-600 leading-relaxed">{group.description}</p>
        ) : (
          <p className="text-xs text-zinc-400 italic">No description</p>
        )}
      </div>
    </div>
  )
}

function MemberRow({ member }: { member: GroupMemberSummary }) {
  const initials = getInitials(member.name)
  return (
    <Link
      to={`/students/${member.id}`}
      className="flex items-center gap-3 py-2 hover:bg-[#F4F2FD] -mx-2 px-2 rounded-lg transition-colors"
      data-testid="member-row"
    >
      <div
        className={cn('shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', getAvatarColor(member.id))}
        aria-hidden
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1B22] truncate">{member.name}</p>
      </div>
      {member.cefrLevel && (
        <CefrBadge level={member.cefrLevel}  />
      )}
    </Link>
  )
}

function SessionRow({ session, groupId, isMostRecent }: { session: GroupSession; groupId: string; isMostRecent: boolean }) {
  const title = session.title ?? (session.actualContent ? session.actualContent.slice(0, 60) : 'Session')
  return (
    <Link
      to={`/groups/${groupId}/sessions/${session.id}`}
      className="bg-white rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-[#F4F2FD] transition-colors"
      style={{ boxShadow: '0 4px 16px rgba(26, 27, 34, 0.05)', minHeight: '64px' }}
      data-testid="group-session-row"
    >
      {session.sessionDate && <CalendarBlock dateStr={session.sessionDate} isMostRecent={isMostRecent} />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#1A1B22] line-clamp-2 leading-snug">{title}</p>
        {session.duration != null && (
          <span className="text-xs text-zinc-500">{session.duration}min</span>
        )}
      </div>
    </Link>
  )
}

export function GroupOverviewTab({
  group,
  sessions,
  followups,
  teachingIdeas,
  onRefetchFollowups,
  onRefetchIdeas,
  onGroupChange,
  onViewAllMembers,
  onViewAllSessions,
}: Props) {
  const members = group.members ?? []
  const displayMembers = members.slice(0, 8)
  const showMembersViewAll = members.length > 8

  const pastSessions = sessions
    .filter(s => !s.isCancelled && s.sessionDate && new Date(s.sessionDate) <= new Date())
    .sort((a, b) => new Date(b.sessionDate!).getTime() - new Date(a.sessionDate!).getTime())
  const lastSession = pastSessions[0] ?? null
  const recentSessions = pastSessions.slice(1, 6)

  return (
    <div className="space-y-6">
      {/* Three-card row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PENDING FOLLOWUPS */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}>
          <StudentFollowupsCard
            followups={followups}
            groupId={group.id}
            onFollowupChange={onRefetchFollowups}
          />
        </div>

        {/* GROUP PROFILE */}
        <GroupProfileCard group={group} />

        {/* TEACHING IDEAS */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}>
          <GroupTeachingIdeasCard
            ideas={teachingIdeas}
            groupId={group.id}
            onRefetch={onRefetchIdeas}
          />
        </div>
      </div>

      {/* LAST SESSION */}
      {lastSession ? (
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }} data-testid="last-session-card">
          <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-zinc-400 mb-4">Last Session</h3>
          <Link
            to={`/groups/${group.id}/sessions/${lastSession.id}`}
            className="flex items-start gap-3 group"
          >
            {lastSession.sessionDate && (
              <div className="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center bg-indigo-100">
                <span className="text-lg font-bold leading-none text-indigo-700">{new Date(lastSession.sessionDate).getDate()}</span>
                <span className="text-[9px] font-bold tracking-wide leading-none mt-0.5 text-indigo-500">
                  {new Date(lastSession.sessionDate).toLocaleString('en-US', { month: 'short' }).toUpperCase()} {new Date(lastSession.sessionDate).getFullYear()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-[#1A1B22] group-hover:text-indigo-700 transition-colors">
                {lastSession.title ?? 'Group session'}
              </p>
              {lastSession.actualContent && (
                <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{lastSession.actualContent}</p>
              )}
            </div>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }} data-testid="last-session-empty">
          <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-zinc-400 mb-2">Last Session</h3>
          <p className="text-sm text-zinc-400 italic">No sessions logged yet.</p>
        </div>
      )}

      {/* MEMBERS section */}
      <div data-testid="members-section">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#1A1B22]">Members</h3>
          {showMembersViewAll && (
            <button
              type="button"
              onClick={onViewAllMembers}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              data-testid="view-all-members-btn"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {displayMembers.length === 0 ? (
          <p className="text-sm text-zinc-400 italic py-2">No members yet.</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {displayMembers.map(m => <MemberRow key={m.id} member={m} />)}
          </div>
        )}
      </div>

      {/* SESSION HISTORY strip */}
      {recentSessions.length > 0 && (
        <div data-testid="session-history-strip">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#1A1B22]">Session History</h3>
            {pastSessions.length > 6 && (
              <button
                type="button"
                onClick={onViewAllSessions}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {recentSessions.map((s, i) => (
              <SessionRow key={s.id} session={s} groupId={group.id} isMostRecent={i === 0} />
            ))}
          </div>
        </div>
      )}

      {/* TEACHER'S WORKING MEMORY */}
      <GroupTeachingNotesPanel
        groupId={group.id}
        teachingNotes={group.teachingNotes ?? null}
        createdAt={group.createdAt}
        onNotesChange={onGroupChange}
      />
    </div>
  )
}
