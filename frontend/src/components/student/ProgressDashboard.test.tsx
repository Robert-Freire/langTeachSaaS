import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressDashboard } from './ProgressDashboard'
import type { Student } from '@/api/students'
import type { SessionLog } from '@/api/sessionLogs'

const baseStudent: Student = {
  id: 'student-1',
  name: 'Ana Martins',
  learningLanguage: 'Spanish',
  cefrLevel: 'B1',
  interests: [],
  personalNotes: null,
  teachingNotes: null,
  nativeLanguages: ['Portuguese'],
  learningGoals: [],
  weaknesses: [],
  difficulties: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  birthYear: null,
  profession: null,
  countryOfOrigin: null,
  cityOfOrigin: null,
  countryOfResidence: null,
  cityOfResidence: null,
  reasonForStudying: null,
  officialCefrLevel: null,
  shortTermObjectives: [],
  isActive: true,
  isCorporate: false,
  rate: null,
  spokenLanguages: [],
  teachingTodos: [],
  skillLevelOverrides: { Reading: 'B2', Speaking: 'B1', Listening: 'B1', Writing: 'A2' },
}

const baseSession: SessionLog = {
  id: 'session-1',
  studentId: 'student-1',
  sessionDate: '2026-03-01T10:00:00Z',
  plannedContent: null,
  actualContent: 'Good session.',
  generalNotes: null,
  homeworkAssigned: null,
  previousHomeworkStatus: 0,
  previousHomeworkStatusName: 'None',
  nextSessionTopics: null,
  levelReassessmentSkill: null,
  levelReassessmentLevel: null,
  linkedLessonId: null,
  topicTags: '[]',
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-01T10:00:00Z',
  isCancelled: false,
  status: 0,
  statusName: 'Confirmed',
  mentionedDifficultyPairs: '[]',
  suggestedDifficulties: '[]',
  duration: 60,
  title: null,
  hasVoiceNote: false,
}

function renderProgress(
  student: Student = baseStudent,
  sessions: SessionLog[] = [],
) {
  return render(<ProgressDashboard student={student} sessions={sessions} />)
}

describe('ProgressDashboard', () => {
  it('renders the progress tab content wrapper', () => {
    renderProgress()
    expect(screen.getByTestId('progress-tab-content')).toBeInTheDocument()
  })

  it('renders skill imbalance section', () => {
    renderProgress()
    expect(screen.getByTestId('skill-imbalance-section')).toBeInTheDocument()
    expect(screen.getByText('Skill Imbalance Analysis')).toBeInTheDocument()
  })

  it('shows skill bars for each configured skill', () => {
    renderProgress()
    expect(screen.getByTestId('skill-bar-reading')).toBeInTheDocument()
    expect(screen.getByTestId('skill-bar-speaking')).toBeInTheDocument()
    expect(screen.getByTestId('skill-bar-listening')).toBeInTheDocument()
    expect(screen.getByTestId('skill-bar-writing')).toBeInTheDocument()
  })

  it('applies primary color to skills at or above baseline', () => {
    renderProgress() // baseline B1, Reading=B2 (above), Speaking=B1 (at), Writing=A2 (below)
    const readingBar = screen.getByTestId('skill-bar-reading')
    expect(readingBar.className).toContain('bg-[#3525CD]')
    const writingBar = screen.getByTestId('skill-bar-writing')
    expect(writingBar.className).toContain('bg-[#C3C0FF]')
  })

  it('shows legend label with BASELINE not TARGET', () => {
    renderProgress()
    expect(screen.getByText(/Baseline B1/i)).toBeInTheDocument()
    expect(screen.queryByText(/Target/i)).not.toBeInTheDocument()
  })

  it('shows empty state when no skill overrides', () => {
    const student = { ...baseStudent, skillLevelOverrides: {} }
    renderProgress(student)
    expect(screen.getByText('No skill assessments recorded yet.')).toBeInTheDocument()
  })

  it('renders pacing section', () => {
    renderProgress(baseStudent, [baseSession])
    expect(screen.getByTestId('pacing-section')).toBeInTheDocument()
    expect(screen.getByText('Pacing Analytics')).toBeInTheDocument()
  })

  it('shows completed session count', () => {
    const sessions = [
      baseSession,
      { ...baseSession, id: 'session-2', sessionDate: '2026-03-08T10:00:00Z' },
    ]
    renderProgress(baseStudent, sessions)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('counts only confirmed non-cancelled sessions', () => {
    const sessions = [
      baseSession,
      { ...baseSession, id: 'session-2', isCancelled: true, sessionDate: '2026-03-08T10:00:00Z' },
    ]
    renderProgress(baseStudent, sessions)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows cancellation rate', () => {
    const sessions = [
      baseSession,
      { ...baseSession, id: 'session-2', isCancelled: true, sessionDate: '2026-03-08T10:00:00Z' },
    ]
    renderProgress(baseStudent, sessions)
    expect(screen.getByTestId('cancellation-rate')).toHaveTextContent('50%')
  })

  it('shows zero cancellation rate with no cancellations', () => {
    renderProgress(baseStudent, [baseSession])
    expect(screen.getByTestId('cancellation-rate')).toHaveTextContent('0%')
  })

  it('shows covered difficulty with Covered badge', () => {
    const student = {
      ...baseStudent,
      difficulties: [
        {
          id: 'd1',
          description: 'Por vs Para',
          competency: 'Grammar',
          subcategory: 'Prepositions',
          severity: 'medium',
          trend: 'stable',
          status: 'Covered',
        },
      ],
    }
    renderProgress(student)
    expect(screen.getByTestId('difficulties-section')).toBeInTheDocument()
    expect(screen.getByText('Por vs Para')).toBeInTheDocument()
    expect(screen.getByText('Covered')).toBeInTheDocument()
  })

  it('shows active difficulty with Working badge when recently mentioned', () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const student = {
      ...baseStudent,
      difficulties: [
        {
          id: 'd1',
          description: 'Subjuntivo',
          competency: 'Grammar',
          subcategory: 'Subjunctive',
          severity: 'high',
          trend: 'stable',
          status: 'Active',
        },
      ],
    }
    const sessions = [
      {
        ...baseSession,
        sessionDate: recentDate,
        mentionedDifficultyPairs: JSON.stringify([{ Competency: 'Grammar', Subcategory: 'Subjunctive' }]),
      },
    ]
    renderProgress(student, sessions)
    expect(screen.getByText('Working')).toBeInTheDocument()
  })

  it('shows active difficulty with Stale badge when not recently mentioned', () => {
    const student = {
      ...baseStudent,
      difficulties: [
        {
          id: 'd1',
          description: 'Ser vs Estar',
          competency: 'Grammar',
          subcategory: 'Verb types',
          severity: 'high',
          trend: 'stable',
          status: 'Active',
        },
      ],
    }
    renderProgress(student, [])
    expect(screen.getByText('Stale')).toBeInTheDocument()
  })

  it('hides difficulties section when student has no difficulties', () => {
    renderProgress(baseStudent, [])
    expect(screen.queryByTestId('difficulties-section')).not.toBeInTheDocument()
  })

  it('renders three coming soon placeholder cards', () => {
    renderProgress()
    expect(screen.getByTestId('coming-soon-section')).toBeInTheDocument()
    expect(screen.getByText('Curriculum Progress')).toBeInTheDocument()
    expect(screen.getByText('Topic Analysis')).toBeInTheDocument()
    expect(screen.getByText('Engagement Trends')).toBeInTheDocument()
    expect(screen.getAllByText('Coming Soon')).toHaveLength(3)
  })

  it('shows Behind badge when student has fewer sessions than expected after 4+ weeks', () => {
    const startDate = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString() // 8 weeks ago
    // Only 2 sessions in 8 weeks (well below 0.8/wk threshold)
    const sessions = [
      { ...baseSession, id: 's1', sessionDate: new Date(Date.now() - 7 * 7 * 24 * 60 * 60 * 1000).toISOString() },
      { ...baseSession, id: 's2', sessionDate: new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000).toISOString() },
    ]
    const student = { ...baseStudent, createdAt: startDate }
    renderProgress(student, sessions)
    expect(screen.getByTestId('pacing-behind-badge')).toBeInTheDocument()
    expect(screen.getByTestId('pacing-behind-badge')).toHaveTextContent('Behind')
  })

  it('does not show Behind badge when student has adequate session frequency', () => {
    const startDate = new Date(Date.now() - 5 * 7 * 24 * 60 * 60 * 1000).toISOString() // 5 weeks ago
    // 10 sessions in 5 weeks (2/wk, well above 1/wk threshold)
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      ...baseSession,
      id: `s${i}`,
      sessionDate: new Date(Date.now() - (5 - Math.floor(i / 2)) * 7 * 24 * 60 * 60 * 1000 - i * 1000).toISOString(),
    }))
    const student = { ...baseStudent, createdAt: startDate }
    renderProgress(student, sessions)
    expect(screen.queryByTestId('pacing-behind-badge')).not.toBeInTheDocument()
  })
})
