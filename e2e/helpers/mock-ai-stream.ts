import { Page } from '@playwright/test'

function makeSseBody(payload: Record<string, unknown>): string {
  const token = JSON.stringify(JSON.stringify(payload))
  return `data: ${token}\n\ndata: [DONE]\n\n`
}

export function sseRoute(payload: Record<string, unknown>) {
  return {
    status: 200,
    contentType: 'text/event-stream',
    headers: { 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    body: makeSseBody(payload),
  }
}

/**
 * Intercepts all AI stream endpoints with a single payload.
 * Must be called before page.goto.
 */
export async function mockAiStream(page: Page, payload: Record<string, unknown>): Promise<void> {
  await page.route('**/api/generate/*/stream', async (route) => {
    await route.fulfill(sseRoute(payload))
  })
}

/**
 * Intercepts each section's AI stream endpoint with a type-specific fixture.
 * Used for full-lesson generation tests where 5 different task types are called.
 * Must be called before page.goto.
 */
export async function mockFullLessonStreams(page: Page): Promise<void> {
  const fixtures: Record<string, Record<string, unknown>> = {
    vocabulary: VOCABULARY_FIXTURE,
    grammar: GRAMMAR_FIXTURE,
    exercises: EXERCISES_FIXTURE,
    conversation: CONVERSATION_FIXTURE,
    reading: READING_FIXTURE,
    homework: HOMEWORK_FIXTURE,
    'free-text': FREE_TEXT_FIXTURE,
  }
  for (const [taskType, payload] of Object.entries(fixtures)) {
    await page.route(`**/api/generate/${taskType}/stream`, async (route) => {
      await route.fulfill(sseRoute(payload))
    })
  }
}

export const EXERCISES_FIXTURE = {
  fillInBlank: [
    { sentence: 'She ___ to the store yesterday.', answer: 'went', hint: "past simple of 'go'", explanation: 'Use the past simple "went" because the action happened at a specific time in the past.' },
  ],
  multipleChoice: [
    { question: 'Which word means happy?', options: ['sad', 'glad', 'angry'], answer: 'glad', explanation: '"Glad" is a common synonym for happy. "Sad" is the opposite, and "angry" means irritated.' },
  ],
  matching: [
    { left: 'hello', right: 'hola', explanation: '"Hola" is the standard Spanish greeting equivalent to "hello".' },
    { left: 'goodbye', right: 'adios', explanation: '"Adios" is the Spanish farewell equivalent to "goodbye".' },
  ],
}

// fragments: ["en", "vivo", "Barcelona", "yo"]
// correctOrder: [3,1,0,2] => "yo vivo en Barcelona"
export const SENTENCE_ORDERING_FIXTURE = {
  fillInBlank: [],
  multipleChoice: [],
  matching: [],
  sentenceOrdering: [
    {
      fragments: ['en', 'vivo', 'Barcelona', 'yo'],
      correctOrder: [3, 1, 0, 2],
      hint: 'Subject + verb + location',
      explanation: 'Spanish declarative sentences typically follow Subject-Verb-Object order.',
    },
    {
      fragments: ['libros', 'Leo', 'los'],
      correctOrder: [1, 2, 0],
      hint: 'Subject + verb + object',
    },
  ],
}

export const SENTENCE_TRANSFORMATION_FIXTURE = {
  fillInBlank: [],
  multipleChoice: [],
  matching: [],
  sentenceTransformation: [
    {
      prompt: 'Rewrite in the past tense',
      original: 'Maria sale de casa a las ocho.',
      expected: 'Maria salio de casa a las ocho.',
      alternatives: ['Maria salia de casa a las ocho.'],
      explanation: 'Both preterito (completed action) and imperfecto (habitual) are valid depending on context.',
      stage: 'guided_free',
    },
    {
      prompt: 'Change to the negative form',
      original: 'Juan tiene hambre.',
      expected: 'Juan no tiene hambre.',
      explanation: 'Place "no" before the conjugated verb to negate.',
      stage: 'meaningful',
    },
  ],
}

export const CONVERSATION_FIXTURE = {
  scenarios: [
    {
      setup: 'You are at a restaurant and want to order food.',
      roleA: 'Waiter',
      roleB: 'Customer',
      roleAPhrases: ['Here is your table.', 'Can I take your order?', 'I recommend the pasta.'],
      roleBPhrases: ["I'd like to order...", 'Could I have...?', 'What do you recommend?'],
    },
  ],
}

export const GRAMMAR_FIXTURE = {
  title: 'Present Simple',
  explanation: 'Used to describe habits, facts, and routines.',
  examples: [
    { sentence: 'She drinks coffee every morning.', note: 'habit' },
    { sentence: 'Water boils at 100°C.', note: 'fact' },
  ],
  commonMistakes: ['Forgetting the -s ending for he/she/it', 'Using present simple for temporary actions'],
}

export const READING_FIXTURE = {
  passage: 'Smartphones have changed the way we communicate. Once considered a luxury, these devices have become ubiquitous in modern society. They have revolutionized how we access information, stay connected, and even conduct business. However, some experts warn that excessive smartphone use may reduce face-to-face interaction.',
  comprehensionQuestions: [
    { question: 'How have smartphones changed communication?', answer: 'They allow instant messaging and video calls.', type: 'detail' },
    { question: 'What is a potential downside mentioned?', answer: 'Reduced face-to-face interaction.', type: 'inference' },
  ],
  vocabularyHighlights: [
    { word: 'ubiquitous', definition: 'Found everywhere; very common.' },
    { word: 'revolutionize', definition: 'To change something completely and fundamentally.' },
  ],
}

export const HOMEWORK_FIXTURE = {
  tasks: [
    {
      type: 'writing',
      instructions: 'Write 5 sentences using the present simple to describe your daily routine.',
      examples: ['I wake up at 7am.', 'She reads the news every day.'],
    },
    {
      type: 'vocabulary',
      instructions: 'Learn and practice the 10 vocabulary words from today\'s lesson.',
      examples: [],
    },
  ],
}

export const FREE_TEXT_FIXTURE = {
  activity: 'Ask the student: "What did you do last weekend?" Listen and ask follow-up questions for 2-3 minutes.',
}

export const VOCABULARY_FIXTURE = {
  items: [
    {
      word: 'departure',
      definition: 'The act of leaving a place, especially to start a journey.',
      exampleSentence: 'The departure of the train was delayed by thirty minutes.',
    },
    {
      word: 'itinerary',
      definition: 'A planned route or journey, including a list of places to visit.',
      exampleSentence: 'She prepared a detailed itinerary for the trip to Spain.',
    },
    {
      word: 'accommodation',
      definition: 'A place where travelers can sleep and stay, such as a hotel or hostel.',
      exampleSentence: 'We booked accommodation near the city center.',
    },
  ],
}
