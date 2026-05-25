import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { StudentDetailHeader } from './StudentDetailHeader'
import type { Student } from '@/api/students'
import type { SessionLog } from '@/api/sessionLogs'

const BASE_STUDENT: Student = {
  id: 'student-1',
  name: 'Ana Garcia',
  learningLanguage: 'Spanish',
  level: { cefrLevel: 'B1', officialCefrLevel: null, skillLevelOverrides: {} },
  languages: { nativeLanguages: ['English'], spokenLanguages: ['French'] },
  identity: {
    birthYear: 1990,
    age: null,
    profession: 'Designer',
    countryOfOrigin: 'UK',
    cityOfOrigin: 'London',
    countryOfResidence: 'Spain',
    cityOfResidence: 'Barcelona',
  },
  profile: {
    interests: ['travel'],
    personalNotes: null,
    teachingNotes: null,
    learningGoals: [],
    weaknesses: [],
    difficulties: [],
    shortTermObjectives: [
      { id: 'obj-1', text: 'DELE B1 exam', targetDate: '2030-06-01', objectiveType: 'exam_prep' as const },
    ],
    teachingTodos: [],
    reasonForStudying: null,
  },
  commercial: { isActive: true, isCorporate: false, rate: null },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  teachingChannel: null,
}

function renderHeader(
  student: Student = BASE_STUDENT,
  nextSession: SessionLog | null = null,
  sessionFrequency: string | null = null
) {
  return render(
    <MemoryRouter>
      <StudentDetailHeader
        student={student}
        nextSession={nextSession}
        sessionFrequency={sessionFrequency}
      />
    </MemoryRouter>
  )
}

describe('StudentDetailHeader', () => {
  it('renders student name', () => {
    renderHeader()
    expect(screen.getByTestId('student-detail-name')).toHaveTextContent('Ana Garcia')
  })

  it('renders CEFR badge', () => {
    renderHeader()
    expect(screen.getByTestId('cefr-badge')).toHaveTextContent('B1')
  })

  it('renders identity subtitle with native language and profession', () => {
    renderHeader()
    expect(screen.getByTestId('student-header-subtitle')).toHaveTextContent(
      'English speaker, learning Spanish'
    )
    expect(screen.getByTestId('student-header-subtitle')).toHaveTextContent('Designer, Barcelona')
  })

  it('renders identity subtitle with only learning language when native language is absent', () => {
    renderHeader({ ...BASE_STUDENT, languages: { ...BASE_STUDENT.languages, nativeLanguages: [] } })
    expect(screen.getByTestId('student-header-subtitle')).toHaveTextContent('Learning Spanish')
    expect(screen.getByTestId('student-header-subtitle')).not.toHaveTextContent('speaker')
  })

  it('shows Active and Private badges for active non-corporate student', () => {
    renderHeader()
    expect(screen.getByTestId('student-status-badge')).toHaveTextContent('Active')
    expect(screen.getByTestId('student-type-badge')).toHaveTextContent('Private')
  })

  it('shows Active and Corporate badges for active corporate student', () => {
    renderHeader({ ...BASE_STUDENT, commercial: { ...BASE_STUDENT.commercial, isCorporate: true } })
    expect(screen.getByTestId('student-status-badge')).toHaveTextContent('Active')
    expect(screen.getByTestId('student-type-badge')).toHaveTextContent('Corporate')
  })

  it('shows Inactive badge and no type badge for inactive student', () => {
    renderHeader({ ...BASE_STUDENT, commercial: { ...BASE_STUDENT.commercial, isActive: false } })
    expect(screen.getByTestId('student-status-badge')).toHaveTextContent('Inactive')
    expect(screen.queryByTestId('student-type-badge')).not.toBeInTheDocument()
  })

  it('renders goal row when short-term objective exists', () => {
    renderHeader()
    expect(screen.getByTestId('primary-objective-card')).toBeInTheDocument()
    expect(screen.getByTestId('objective-text')).toHaveTextContent('DELE B1 exam')
  })

  it('hides goal row when no objectives', () => {
    renderHeader({ ...BASE_STUDENT, profile: { ...BASE_STUDENT.profile, shortTermObjectives: [] } })
    expect(screen.queryByTestId('primary-objective-card')).not.toBeInTheDocument()
  })

  it('shows next-session pill when nextSession is provided', () => {
    const future = new Date()
    future.setDate(future.getDate() + 7)
    const session: SessionLog = {
      id: 'sess-1',
      studentId: 'student-1',
      groupId: null,
      targetType: 'student',
      targetName: 'Test Student',
      sessionDate: future.toISOString(),
      title: null,
      plannedContent: null,
      actualContent: null,
      homeworkAssigned: null,
      previousHomeworkStatus: 0,
      previousHomeworkStatusName: 'NotDone',
      nextSessionTopics: null,
      generalNotes: null,
      levelReassessmentSkill: null,
      levelReassessmentLevel: null,
      linkedLessonId: null,
      topicTags: '[]',
      createdAt: future.toISOString(),
      updatedAt: future.toISOString(),
      isCancelled: false,
      status: 1,
      statusName: 'Confirmed',
      mentionedDifficultyPairs: '[]',
      suggestedDifficulties: '[]',
      duration: 60,
      hasVoiceNote: false,
    }
    renderHeader(BASE_STUDENT, session)
    expect(screen.getByTestId('next-session-pill')).toBeInTheDocument()
  })

  it('hides next-session pill when nextSession is null', () => {
    renderHeader()
    expect(screen.queryByTestId('next-session-pill')).not.toBeInTheDocument()
  })

  it('shows session frequency indicator when provided', () => {
    renderHeader(BASE_STUDENT, null, '4 sessions in 6 weeks · avg. every 11 days')
    expect(screen.getByTestId('session-frequency-indicator')).toHaveTextContent('4 sessions')
  })

  it('hides session frequency indicator when null', () => {
    renderHeader()
    expect(screen.queryByTestId('session-frequency-indicator')).not.toBeInTheDocument()
  })

  it('shows official CEFR badge when set', () => {
    renderHeader({ ...BASE_STUDENT, level: { ...BASE_STUDENT.level, officialCefrLevel: 'A2' } })
    expect(screen.getByTestId('official-cefr-badge')).toHaveTextContent('A2')
  })

  it('renders Edit Student link and Log Session button', () => {
    renderHeader()
    expect(screen.getByTestId('edit-profile-link')).toBeInTheDocument()
    expect(screen.getByTestId('log-session-button')).toBeInTheDocument()
  })

  it('all required elements are present regardless of tab context', () => {
    renderHeader()
    expect(screen.getByTestId('student-detail-name')).toBeInTheDocument()
    expect(screen.getByTestId('cefr-badge')).toBeInTheDocument()
    expect(screen.getByTestId('student-header-subtitle')).toBeInTheDocument()
    expect(screen.getByTestId('student-status-badge')).toBeInTheDocument()
    expect(screen.getByTestId('primary-objective-card')).toBeInTheDocument()
    expect(screen.getByTestId('edit-profile-link')).toBeInTheDocument()
    expect(screen.getByTestId('log-session-button')).toBeInTheDocument()
  })

  it('shows teaching channel badge when teachingChannel is set', () => {
    renderHeader({ ...BASE_STUDENT, teachingChannel: 'Preply' })
    const badge = screen.getByTestId('teaching-channel-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Preply')
  })

  it('does not render teaching channel badge when teachingChannel is null', () => {
    renderHeader()
    expect(screen.queryByTestId('teaching-channel-badge')).not.toBeInTheDocument()
  })

  it('does not render voice update button when onVoiceUpdateClick is not provided', () => {
    renderHeader()
    expect(screen.queryByTestId('voice-update-button')).not.toBeInTheDocument()
  })

  it('renders voice update button when onVoiceUpdateClick is provided', () => {
    render(
      <MemoryRouter>
        <StudentDetailHeader
          student={BASE_STUDENT}
          nextSession={null}
          sessionFrequency={null}
          onVoiceUpdateClick={vi.fn()}
        />
      </MemoryRouter>
    )
    expect(screen.getByTestId('voice-update-button')).toBeInTheDocument()
  })

  it('disables voice update button when voiceFlowActive is true', () => {
    render(
      <MemoryRouter>
        <StudentDetailHeader
          student={BASE_STUDENT}
          nextSession={null}
          sessionFrequency={null}
          onVoiceUpdateClick={vi.fn()}
          voiceFlowActive={true}
        />
      </MemoryRouter>
    )
    expect(screen.getByTestId('voice-update-button')).toBeDisabled()
  })

  it('renders no group pills when groups prop is empty', () => {
    renderHeader()
    expect(screen.queryAllByTestId('group-affiliation-pill')).toHaveLength(0)
  })

  it('renders group affiliation pills, dropping the level only when the name already implies it', () => {
    render(
      <MemoryRouter>
        <StudentDetailHeader
          student={BASE_STUDENT}
          nextSession={null}
          sessionFrequency={null}
          groups={[
            // Name already references the level -> trailing " - B1" is dropped as redundant.
            { id: 'g1', name: 'B1 Conversacion', cefrLevel: 'B1' },
            // No level -> name only.
            { id: 'g2', name: 'Exam Prep', cefrLevel: null },
            // Name does not reference the level -> level is appended.
            { id: 'g3', name: 'Lunes', cefrLevel: 'B2' },
          ]}
        />
      </MemoryRouter>
    )
    const pills = screen.getAllByTestId('group-affiliation-pill')
    expect(pills).toHaveLength(3)
    expect(pills[0]).toHaveTextContent(/^B1 Conversacion$/)
    expect(pills[1]).toHaveTextContent(/^Exam Prep$/)
    expect(pills[2]).toHaveTextContent(/^Lunes - B2$/)
  })
})
