import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ExercisesRenderer } from './ExercisesRenderer'
import type { ExercisesContent, ExercisesSentenceOrdering, ExercisesSentenceTransformation } from '../../../types/contentTypes'

function makeContent(overrides?: Partial<ExercisesContent>): ExercisesContent {
  return {
    fillInBlank: [
      { sentence: 'She ___ to the store.', answer: 'went', hint: "past of 'go'" },
    ],
    multipleChoice: [
      { question: 'Which word means happy?', options: ['sad', 'glad', 'angry'], answer: 'glad' },
    ],
    matching: [
      { left: 'hello', right: 'hola' },
      { left: 'goodbye', right: 'adios' },
    ],
    trueFalse: [],
    ...overrides,
  }
}

function makeSoItem(overrides?: Partial<ExercisesSentenceOrdering>): ExercisesSentenceOrdering {
  // fragments: ["en", "vivo", "Barcelona", "yo"]
  // correctOrder: [3, 1, 0, 2] = "yo vivo en Barcelona"
  return {
    fragments: ['en', 'vivo', 'Barcelona', 'yo'],
    correctOrder: [3, 1, 0, 2],
    ...overrides,
  }
}

const raw = (c: ExercisesContent) => JSON.stringify(c)

describe('ExercisesRenderer.Preview', () => {
  it('renders fill-in-blank, multiple choice, and matching sections', () => {
    const content = makeContent()
    render(<ExercisesRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('exercises-preview')).toBeInTheDocument()
    expect(screen.getByText(/She.*store/)).toBeInTheDocument()
    expect(screen.getByText('Which word means happy?')).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('replaces ___ with visual blank in preview', () => {
    const content = makeContent()
    render(<ExercisesRenderer.Preview rawContent={raw(content)} parsedContent={content} />)
    expect(screen.getByText(/\[/)).toBeInTheDocument()
  })

  it('shows teacher error when parsedContent does not match schema', () => {
    render(<ExercisesRenderer.Preview rawContent="not valid" parsedContent={{}} />)
    expect(screen.getByText(/could not be parsed/)).toBeInTheDocument()
  })
})

describe('ExercisesRenderer.Editor', () => {
  it('renders exercises-editor with all three sections', () => {
    const content = makeContent()
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={vi.fn()} />)

    expect(screen.getByTestId('exercises-editor')).toBeInTheDocument()
    expect(screen.getByText('Fill in the Blank')).toBeInTheDocument()
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument()
    expect(screen.getByText('Matching')).toBeInTheDocument()
  })

  it('calls onChange when fill-in-blank sentence is edited', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.type(screen.getByDisplayValue("She ___ to the store."), 'X')
    expect(onChange).toHaveBeenCalled()
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.fillInBlank[0].sentence).toBe('She ___ to the store.X')
  })

  it('calls onChange when a fill-in-blank item is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    const addButtons = screen.getAllByText('+ Add item')
    await userEvent.click(addButtons[0])
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.fillInBlank).toHaveLength(2)
  })

  it('calls onChange when a multiple choice question is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByText('+ Add question'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.multipleChoice).toHaveLength(2)
  })

  it('calls onChange when a matching pair is added', async () => {
    const content = makeContent()
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)

    await userEvent.click(screen.getByText('+ Add pair'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.matching).toHaveLength(3)
  })

  it('shows friendly error instead of raw textarea when parsedContent does not match schema', () => {
    render(<ExercisesRenderer.Editor rawContent="not valid" parsedContent="a string" onChange={vi.fn()} />)
    expect(screen.getByText(/unexpected format/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})

describe('ExercisesRenderer coerce', () => {
  it('coerces missing arrays to empty arrays', () => {
    const partial = { fillInBlank: [{ sentence: 'S', answer: 'A' }] }
    const result = ExercisesRenderer.coerce(partial) as { fillInBlank: unknown[]; multipleChoice: unknown[]; matching: unknown[]; trueFalse: unknown[] }
    expect(result.fillInBlank).toHaveLength(1)
    expect(result.multipleChoice).toEqual([])
    expect(result.matching).toEqual([])
    expect(result.trueFalse).toEqual([])
  })

  it('returns null for completely unrecognised input', () => {
    expect(ExercisesRenderer.coerce('bad')).toBeNull()
  })
})

describe('ExercisesRenderer.Student', () => {
  it('renders fill-in-blank inputs and check answers button', () => {
    const content = makeContent()
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('exercises-student')).toBeInTheDocument()
    expect(screen.getByTestId('fib-input-0')).toBeInTheDocument()
    expect(screen.getByTestId('mc-option-0-0')).toBeInTheDocument()
    expect(screen.getByTestId('check-answers-btn')).toBeInTheDocument()
  })

  it('shows score after checking correct answers', async () => {
    const content = makeContent()
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'went')
    await userEvent.click(screen.getByTestId('mc-option-0-1')) // 'glad'
    await userEvent.click(screen.getByTestId('match-left-0'))
    await userEvent.click(screen.getByText('hola'))
    await userEvent.click(screen.getByTestId('match-left-1'))
    await userEvent.click(screen.getByText('adios'))

    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('score-summary')).toHaveTextContent('You got 4 / 4 correct')
    expect(screen.getByTestId('fib-result-0')).toHaveTextContent('✓')
  })

  it('shows wrong answer feedback after checking', async () => {
    const content = makeContent()
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'wrong')
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('fib-result-0')).toHaveTextContent('✗')
    expect(screen.getByTestId('score-summary')).toHaveTextContent('You got 0 / 4 correct')
  })

  it('try again resets the form', async () => {
    const content = makeContent()
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'went')
    await userEvent.click(screen.getByTestId('check-answers-btn'))
    await userEvent.click(screen.getByTestId('try-again-btn'))

    expect(screen.getByTestId('fib-input-0')).toHaveValue('')
    expect(screen.getByTestId('check-answers-btn')).toBeInTheDocument()
  })

  it('shows student error when parsedContent does not match schema', () => {
    render(<ExercisesRenderer.Student rawContent="not valid" parsedContent={42} />)
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument()
  })

  it('shows explanation below wrong fill-in-blank answer', async () => {
    const content = makeContent({
      fillInBlank: [{ sentence: 'She ___ to the store.', answer: 'went', hint: "past of 'go'", explanation: 'Use past simple "went" here.' }],
    })
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'go')
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('fib-result-0')).toHaveTextContent('✗')
    expect(screen.getByTestId('fib-explanation-0')).toHaveTextContent('Use past simple "went" here.')
  })

  it('shows explanation below wrong multiple choice answer', async () => {
    const content = makeContent({
      multipleChoice: [{ question: 'Which word means happy?', options: ['sad', 'glad', 'angry'], answer: 'glad', explanation: '"Glad" is a synonym for happy.' }],
    })
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.click(screen.getByTestId('mc-option-0-0')) // 'sad' — wrong
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('mc-result-0')).toHaveTextContent('✗')
    expect(screen.getByTestId('mc-explanation-0')).toHaveTextContent('"Glad" is a synonym for happy.')
  })

  it('does not show explanation when answer is correct', async () => {
    const content = makeContent({
      fillInBlank: [{ sentence: 'She ___ to the store.', answer: 'went', explanation: 'Use past simple.' }],
    })
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'went')
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('fib-result-0')).toHaveTextContent('✓')
    expect(screen.queryByTestId('fib-explanation-0')).not.toBeInTheDocument()
  })

  it('shows explanation for wrong matching answer', async () => {
    const content = makeContent({
      matching: [
        { left: 'hello', right: 'hola', explanation: '"Hola" is the Spanish greeting for "hello".' },
        { left: 'goodbye', right: 'adios' },
      ],
    })
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    // Pair "hello" with "adios" (wrong) and leave "goodbye" unpaired
    await userEvent.click(screen.getByTestId('match-left-0'))
    await userEvent.click(screen.getByText('adios'))
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('match-explanation-0')).toHaveTextContent('"Hola" is the Spanish greeting')
  })

  it('gracefully shows only correct answer when explanation is absent', async () => {
    const content = makeContent() // no explanation fields
    render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)

    await userEvent.type(screen.getByTestId('fib-input-0'), 'wrong')
    await userEvent.click(screen.getByTestId('check-answers-btn'))

    expect(screen.getByTestId('fib-result-0')).toHaveTextContent('✗ went')
    expect(screen.queryByTestId('fib-explanation-0')).not.toBeInTheDocument()
  })
})

describe('ExercisesRenderer sentenceOrdering', () => {
  describe('Preview', () => {
    it('renders sentence ordering section when items are present', () => {
      const content = makeContent({ sentenceOrdering: [makeSoItem()] })
      render(<ExercisesRenderer.Preview rawContent={JSON.stringify(content)} parsedContent={content} />)

      expect(screen.getByText('Sentence Ordering')).toBeInTheDocument()
      expect(screen.getByText('yo')).toBeInTheDocument()
      expect(screen.getByText('vivo')).toBeInTheDocument()
    })

    it('shows correct answer in preview', () => {
      const content = makeContent({ sentenceOrdering: [makeSoItem()] })
      render(<ExercisesRenderer.Preview rawContent={JSON.stringify(content)} parsedContent={content} />)

      expect(screen.getByText(/Answer: yo vivo en Barcelona/)).toBeInTheDocument()
    })

    it('does not render sentence ordering section when no items present', () => {
      const content = makeContent()
      render(<ExercisesRenderer.Preview rawContent={JSON.stringify(content)} parsedContent={content} />)

      expect(screen.queryByText('Sentence Ordering')).not.toBeInTheDocument()
    })
  })

  describe('Editor', () => {
    it('renders sentence ordering section heading', () => {
      const content = makeContent({ sentenceOrdering: [makeSoItem()] })
      render(<ExercisesRenderer.Editor rawContent={JSON.stringify(content)} parsedContent={content} onChange={vi.fn()} />)

      expect(screen.getByText('Sentence Ordering')).toBeInTheDocument()
    })

    it('calls onChange when a sentence ordering item is added', async () => {
      const content = makeContent({ sentenceOrdering: [] })
      const onChange = vi.fn()
      render(<ExercisesRenderer.Editor rawContent={JSON.stringify(content)} parsedContent={content} onChange={onChange} />)

      // "Add item" buttons: FIB, MC, Match, TF, SO, ST (sentence transformation is last)
      const addButtons = screen.getAllByText('+ Add item')
      await userEvent.click(addButtons[addButtons.length - 2])
      const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
      expect(last.sentenceOrdering).toHaveLength(1)
    })

    it('preserves sentenceOrdering when editing other sections', async () => {
      const content = makeContent({ sentenceOrdering: [makeSoItem()] })
      const onChange = vi.fn()
      render(<ExercisesRenderer.Editor rawContent={JSON.stringify(content)} parsedContent={content} onChange={onChange} />)

      await userEvent.type(screen.getByDisplayValue("She ___ to the store."), 'X')
      const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
      expect(last.sentenceOrdering).toHaveLength(1)
      expect(last.sentenceOrdering[0].fragments).toEqual(['en', 'vivo', 'Barcelona', 'yo'])
    })
  })

  describe('Student', () => {
    it('renders sentence ordering chips', () => {
      const content = makeContent({ sentenceOrdering: [makeSoItem()] })
      render(<ExercisesRenderer.Student rawContent={JSON.stringify(content)} parsedContent={content} />)

      expect(screen.getByTestId('so-item-0')).toBeInTheDocument()
    })

    it('clicking a fragment chip appends it to the answer sequence', async () => {
      const content = makeContent({ sentenceOrdering: [makeSoItem()] })
      render(<ExercisesRenderer.Student rawContent={JSON.stringify(content)} parsedContent={content} />)

      // The scrambled order (rotate by half of 4 = 2) puts indices [2,3,0,1] first
      // fragment[2] = "Barcelona", fragment[3] = "yo", fragment[0] = "en", fragment[1] = "vivo"
      // Click "yo" (fragIdx=3) which appears in the fragment pool
      await userEvent.click(screen.getByTestId('so-fragment-0-3'))
      expect(screen.getByTestId('so-chosen-0-0')).toHaveTextContent('yo')
    })

    it('clicking a placed chip removes it from the answer sequence', async () => {
      const content = makeContent({ sentenceOrdering: [makeSoItem()] })
      render(<ExercisesRenderer.Student rawContent={JSON.stringify(content)} parsedContent={content} />)

      await userEvent.click(screen.getByTestId('so-fragment-0-3'))
      expect(screen.getByTestId('so-chosen-0-0')).toBeInTheDocument()

      await userEvent.click(screen.getByTestId('so-chosen-0-0'))
      expect(screen.queryByTestId('so-chosen-0-0')).not.toBeInTheDocument()
    })

    it('validates correct answer and shows checkmark', async () => {
      const content = makeContent({ sentenceOrdering: [makeSoItem()] })
      render(<ExercisesRenderer.Student rawContent={JSON.stringify(content)} parsedContent={content} />)

      // correctOrder = [3,1,0,2] → click fragments in that index order
      await userEvent.click(screen.getByTestId('so-fragment-0-3')) // "yo"
      await userEvent.click(screen.getByTestId('so-fragment-0-1')) // "vivo"
      await userEvent.click(screen.getByTestId('so-fragment-0-0')) // "en"
      await userEvent.click(screen.getByTestId('so-fragment-0-2')) // "Barcelona"

      await userEvent.click(screen.getByTestId('check-answers-btn'))

      expect(screen.getByTestId('so-result-0')).toHaveTextContent('✓')
    })

    it('counts sentence ordering in total score', async () => {
      const content = makeContent({ sentenceOrdering: [makeSoItem()] })
      render(<ExercisesRenderer.Student rawContent={JSON.stringify(content)} parsedContent={content} />)

      // Answer only FIB correctly (3 other questions unanswered, so-item wrong = 0)
      await userEvent.type(screen.getByTestId('fib-input-0'), 'went')
      await userEvent.click(screen.getByTestId('check-answers-btn'))

      // totalQuestions = FIB(1) + MC(1) + matching(2) + SO(1) = 5
      expect(screen.getByTestId('score-summary')).toHaveTextContent('/ 5 correct')
    })

    it('shows correct answer when sentence ordering is wrong', async () => {
      const content = makeContent({ sentenceOrdering: [makeSoItem({ explanation: 'Subject first.' })] })
      render(<ExercisesRenderer.Student rawContent={JSON.stringify(content)} parsedContent={content} />)

      // Click only one fragment (wrong order)
      await userEvent.click(screen.getByTestId('so-fragment-0-0')) // "en" first — wrong
      await userEvent.click(screen.getByTestId('check-answers-btn'))

      expect(screen.getByTestId('so-result-0')).toHaveTextContent('✗')
      expect(screen.getByTestId('so-result-0')).toHaveTextContent('yo vivo en Barcelona')
      expect(screen.getByTestId('so-explanation-0')).toHaveTextContent('Subject first.')
    })
  })
})

describe('ExercisesRenderer coerce (sentenceOrdering)', () => {
  it('preserves sentenceOrdering items during coercion', () => {
    const input = {
      fillInBlank: [],
      multipleChoice: [],
      matching: [],
      sentenceOrdering: [{ fragments: ['yo', 'soy'], correctOrder: [0, 1] }],
    }
    const result = ExercisesRenderer.coerce(input)
    expect(result?.sentenceOrdering).toHaveLength(1)
    expect(result?.sentenceOrdering?.[0].fragments).toEqual(['yo', 'soy'])
  })

  it('handles AI response with only sentenceOrdering (no other arrays)', () => {
    const input = { sentenceOrdering: [{ fragments: ['yo', 'soy'], correctOrder: [0, 1] }] }
    const result = ExercisesRenderer.coerce(input)
    expect(result).not.toBeNull()
    expect(result?.sentenceOrdering).toHaveLength(1)
    expect(result?.fillInBlank).toEqual([])
    expect(result?.multipleChoice).toEqual([])
    expect(result?.matching).toEqual([])
  })
})

describe('ExercisesRenderer stage grouping', () => {
  it('Editor shows stage badges on items with stage fields', () => {
    const content = makeContent({
      fillInBlank: [
        { sentence: 'She ___ to the store.', answer: 'went', stage: 'controlled' },
      ],
      multipleChoice: [
        { question: 'Which word means happy?', options: ['sad', 'glad', 'angry'], answer: 'glad', stage: 'meaningful' },
      ],
    })
    render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={vi.fn()} />)

    expect(screen.getByTitle('Controlada')).toBeInTheDocument()
    expect(screen.getByTitle('Significativa')).toBeInTheDocument()
  })

  it('Preview shows stage headers when items have stage fields', () => {
    const content = makeContent({
      fillInBlank: [
        { sentence: 'She ___ to the store.', answer: 'went', stage: 'controlled' },
        { sentence: 'I ___ hungry.', answer: 'am', stage: 'meaningful' },
      ],
    })
    render(<ExercisesRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.getByTestId('stage-header-controlled')).toBeInTheDocument()
    expect(screen.getByTestId('stage-header-meaningful')).toBeInTheDocument()
  })

  it('Preview renders without stage headers when no items have stage fields', () => {
    const content = makeContent()
    render(<ExercisesRenderer.Preview rawContent={raw(content)} parsedContent={content} />)

    expect(screen.queryByTestId('stage-header-controlled')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stage-header-meaningful')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stage-header-guided_free')).not.toBeInTheDocument()
  })
})

describe('ExercisesRenderer trueFalse', () => {
  const tfContent = makeContent({
    trueFalse: [
      { statement: 'Maria works in an office.', isTrue: false, justification: 'El texto dice que trabaja desde casa.' },
    ],
  })

  it('Preview renders trueFalse section with statement and V/F placeholder', () => {
    render(<ExercisesRenderer.Preview rawContent={raw(tfContent)} parsedContent={tfContent} />)
    expect(screen.getByText('Maria works in an office.')).toBeInTheDocument()
    expect(screen.getByText(/V \/ F/)).toBeInTheDocument()
  })

  it('Editor renders trueFalse section with statement input and answer select', () => {
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(tfContent)} parsedContent={tfContent} onChange={onChange} />)
    expect(screen.getByText('True / False with Justification')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Maria works in an office.')).toBeInTheDocument()
    expect(screen.getByTestId('tf-answer-0')).toBeInTheDocument()
  })

  it('Editor calls onChange when trueFalse statement is edited', async () => {
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(tfContent)} parsedContent={tfContent} onChange={onChange} />)
    await userEvent.type(screen.getByDisplayValue('Maria works in an office.'), 'X')
    expect(onChange).toHaveBeenCalled()
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.trueFalse[0].statement).toBe('Maria works in an office.X')
  })

  it('Editor calls onChange when a trueFalse item is added', async () => {
    const onChange = vi.fn()
    render(<ExercisesRenderer.Editor rawContent={raw(tfContent)} parsedContent={tfContent} onChange={onChange} />)
    await userEvent.click(screen.getByText('+ Add statement'))
    const last = JSON.parse(onChange.mock.calls[onChange.mock.calls.length - 1][0])
    expect(last.trueFalse).toHaveLength(2)
  })

  it('Student renders trueFalse radio options and justification textarea', () => {
    render(<ExercisesRenderer.Student rawContent={raw(tfContent)} parsedContent={tfContent} />)
    expect(screen.getByText('Maria works in an office.')).toBeInTheDocument()
    expect(screen.getByTestId('tf-option-true-0')).toBeInTheDocument()
    expect(screen.getByTestId('tf-option-false-0')).toBeInTheDocument()
    expect(screen.getByTestId('tf-justification-0')).toBeInTheDocument()
  })

  it('Student counts trueFalse T/F selection in score (correct answer = Falso)', async () => {
    render(<ExercisesRenderer.Student rawContent={raw(tfContent)} parsedContent={tfContent} />)
    await userEvent.click(screen.getByTestId('tf-option-false-0')) // correct: isTrue = false
    await userEvent.click(screen.getByTestId('check-answers-btn'))
    expect(screen.getByTestId('tf-result-0')).toHaveTextContent('✓')
    // score: fib (1) + mc (1) + match (2) + tf (1) = 5 total, but only tf answered → 0 + tf correct
    const summary = screen.getByTestId('score-summary')
    expect(summary).toHaveTextContent('/ 5 correct')
  })

  it('Student shows wrong feedback when trueFalse T/F is incorrect', async () => {
    render(<ExercisesRenderer.Student rawContent={raw(tfContent)} parsedContent={tfContent} />)
    await userEvent.click(screen.getByTestId('tf-option-true-0')) // wrong: isTrue = false
    await userEvent.click(screen.getByTestId('check-answers-btn'))
    expect(screen.getByTestId('tf-result-0')).toHaveTextContent('✗')
  })

  it('Student shows model justification after Check regardless of correctness', async () => {
    render(<ExercisesRenderer.Student rawContent={raw(tfContent)} parsedContent={tfContent} />)
    await userEvent.click(screen.getByTestId('tf-option-true-0'))
    await userEvent.click(screen.getByTestId('check-answers-btn'))
    expect(screen.getByTestId('tf-model-answer-0')).toHaveTextContent('El texto dice que trabaja desde casa.')
  })

  it('Student justification textarea does not affect score', async () => {
    render(<ExercisesRenderer.Student rawContent={raw(tfContent)} parsedContent={tfContent} />)
    await userEvent.type(screen.getByTestId('tf-justification-0'), 'some text')
    await userEvent.click(screen.getByTestId('tf-option-false-0'))
    await userEvent.click(screen.getByTestId('check-answers-btn'))
    // tf correct + no other answers = 1 correct out of 5
    expect(screen.getByTestId('score-summary')).toHaveTextContent('You got 1 / 5 correct')
  })
})

describe('ExercisesRenderer coerce trueFalse', () => {
  it('coerces missing trueFalse to empty array', () => {
    const partial = { fillInBlank: [{ sentence: 'S', answer: 'A' }] }
    const result = ExercisesRenderer.coerce(partial) as ExercisesContent
    expect(result.trueFalse ?? []).toEqual([])
  })

  it('coerces true_false snake_case key', () => {
    const partial = { true_false: [{ statement: 'X', isTrue: true, justification: 'Y' }] }
    const result = ExercisesRenderer.coerce(partial) as ExercisesContent
    expect(result.trueFalse).toHaveLength(1)
    expect(result.trueFalse![0].statement).toBe('X')
  })
})

// ─── Sentence Transformation ──────────────────────────────────────────────────

function makeStItem(overrides?: Partial<ExercisesSentenceTransformation>): ExercisesSentenceTransformation {
  return {
    prompt: 'Rewrite in the past tense',
    original: 'Maria sale de casa.',
    expected: 'Maria salio de casa.',
    alternatives: ['Maria salia de casa.'],
    explanation: 'Both preterito and imperfecto are valid.',
    ...overrides,
  }
}

describe('ExercisesRenderer sentenceTransformation', () => {
  describe('Editor', () => {
    it('renders sentence transformation section when items are present', () => {
      const content = makeContent({ sentenceTransformation: [makeStItem()] })
      render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={vi.fn()} />)
      expect(screen.getByText('Sentence Transformation')).toBeInTheDocument()
    })

    it('calls onChange when a sentence transformation item is added', async () => {
      const content = makeContent({ sentenceTransformation: [] })
      const onChange = vi.fn()
      render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)
      const addBtns = screen.getAllByText('+ Add item')
      await userEvent.click(addBtns[addBtns.length - 1])
      const last = JSON.parse(onChange.mock.calls.at(-1)![0]) as ExercisesContent
      expect(last.sentenceTransformation).toHaveLength(1)
    })

    it('preserves sentenceTransformation when editing other sections', async () => {
      const content = makeContent({ sentenceTransformation: [makeStItem()] })
      const onChange = vi.fn()
      render(<ExercisesRenderer.Editor rawContent={raw(content)} parsedContent={content} onChange={onChange} />)
      const addBtns = screen.getAllByText('+ Add item')
      await userEvent.click(addBtns[0])
      const last = JSON.parse(onChange.mock.calls.at(-1)![0]) as ExercisesContent
      expect(last.sentenceTransformation).toHaveLength(1)
      expect(last.sentenceTransformation![0].expected).toBe('Maria salio de casa.')
    })
  })

  describe('Preview', () => {
    it('renders sentence transformation section', () => {
      const content = makeContent({ sentenceTransformation: [makeStItem()] })
      render(<ExercisesRenderer.Preview rawContent={raw(content)} parsedContent={content} />)
      expect(screen.getByText('Sentence Transformation')).toBeInTheDocument()
      expect(screen.getByText(/Maria sale de casa/)).toBeInTheDocument()
    })

    it('shows alternatives in preview', () => {
      const content = makeContent({ sentenceTransformation: [makeStItem()] })
      render(<ExercisesRenderer.Preview rawContent={raw(content)} parsedContent={content} />)
      expect(screen.getByText(/Also accepted/)).toBeInTheDocument()
    })
  })

  describe('Student', () => {
    it('renders input for transformation', () => {
      const content = makeContent({ sentenceTransformation: [makeStItem()], fillInBlank: [], multipleChoice: [], matching: [] })
      render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)
      expect(screen.getByTestId('st-input-0')).toBeInTheDocument()
      expect(screen.getByText(/Rewrite in the past tense/)).toBeInTheDocument()
    })

    it('marks correct when answer matches expected', async () => {
      const content = makeContent({ sentenceTransformation: [makeStItem()], fillInBlank: [], multipleChoice: [], matching: [] })
      render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)
      await userEvent.type(screen.getByTestId('st-input-0'), 'Maria salio de casa.')
      await userEvent.click(screen.getByTestId('check-answers-btn'))
      expect(screen.getByTestId('st-result-0')).toHaveTextContent('Correct')
      expect(screen.getByTestId('score-summary')).toHaveTextContent('1 / 1 correct')
    })

    it('marks correct when answer matches an alternative', async () => {
      const content = makeContent({ sentenceTransformation: [makeStItem()], fillInBlank: [], multipleChoice: [], matching: [] })
      render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)
      await userEvent.type(screen.getByTestId('st-input-0'), 'Maria salia de casa.')
      await userEvent.click(screen.getByTestId('check-answers-btn'))
      expect(screen.getByTestId('st-result-0')).toHaveTextContent('Correct')
    })

    it('shows model answer and explanation when wrong', async () => {
      const content = makeContent({ sentenceTransformation: [makeStItem()], fillInBlank: [], multipleChoice: [], matching: [] })
      render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)
      await userEvent.type(screen.getByTestId('st-input-0'), 'wrong answer')
      await userEvent.click(screen.getByTestId('check-answers-btn'))
      expect(screen.getByTestId('st-result-0')).toHaveTextContent('Maria salio de casa.')
      expect(screen.getByTestId('st-explanation-0')).toHaveTextContent('preterito')
    })

    it('counts sentence transformation in total score', async () => {
      const content = makeContent({ sentenceTransformation: [makeStItem()], fillInBlank: [], multipleChoice: [], matching: [] })
      render(<ExercisesRenderer.Student rawContent={raw(content)} parsedContent={content} />)
      await userEvent.click(screen.getByTestId('check-answers-btn'))
      expect(screen.getByTestId('score-summary')).toHaveTextContent('0 / 1 correct')
    })
  })
})

describe('ExercisesRenderer coerce sentenceTransformation', () => {
  it('coerces missing sentenceTransformation to undefined', () => {
    const partial = { fillInBlank: [{ sentence: 'S', answer: 'A' }] }
    const result = ExercisesRenderer.coerce(partial) as ExercisesContent
    expect(result.sentenceTransformation).toBeUndefined()
  })

  it('coerces sentence_transformation snake_case key', () => {
    const partial = { sentence_transformation: [{ prompt: 'P', original: 'O', expected: 'E' }] }
    const result = ExercisesRenderer.coerce(partial) as ExercisesContent
    expect(result.sentenceTransformation).toHaveLength(1)
    expect(result.sentenceTransformation![0].prompt).toBe('P')
  })
})
