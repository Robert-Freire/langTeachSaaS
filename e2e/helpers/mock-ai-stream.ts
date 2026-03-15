import { Page } from '@playwright/test'

/**
 * Intercepts the AI stream endpoint and returns a deterministic SSE response.
 * Must be called before page.goto so the route is registered in time.
 */
export async function mockAiStream(page: Page, payload: Record<string, unknown>): Promise<void> {
  await page.route('**/api/generate/*/stream', async (route) => {
    const jsonPayload = JSON.stringify(payload)
    const token = JSON.stringify(jsonPayload)
    const body = `data: ${token}\n\ndata: [DONE]\n\n`

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body,
    })
  })
}

export const VOCABULARY_FIXTURE = {
  items: [
    {
      word: 'departure',
      definition: 'The act of leaving a place, especially to start a journey.',
      exampleSentence: 'The departure of the train was delayed by thirty minutes.',
      translation: 'salida',
    },
    {
      word: 'itinerary',
      definition: 'A planned route or journey, including a list of places to visit.',
      exampleSentence: 'She prepared a detailed itinerary for the trip to Spain.',
      translation: 'itinerario',
    },
    {
      word: 'accommodation',
      definition: 'A place where travelers can sleep and stay, such as a hotel or hostel.',
      exampleSentence: 'We booked accommodation near the city center.',
      translation: 'alojamiento',
    },
  ],
}
