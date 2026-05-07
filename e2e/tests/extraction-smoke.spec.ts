import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import { createStudentViaApi } from '../helpers/students'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5178'

// Verbatim transcripts from the ground-truth test corpus (TC-33 to TC-36).
// Source: plan/sprints/unified-voice-chat-test-corpus.md
const TC33_HANNA = `Hannah, en la clase de hoy hemos trabajado. Los verbos de cambio hemos hecho prácticas. Hemos tenido una conversación sobre sus gustos musicales porque también toca el piano y también toca un instrumento, que es como el piano, que va con palillos. Y para la próxima clase tengo que trabajar alguna actividad más de verbos, de cambio, de práctica, de verbos de cambio. ¿Y puedo introducir algún tema nuevo?`

const TC34_GERGANA_28APR = `Delgada en la clase de hoy a las 10:00 H de la mañana. Hemos trabajado los pronombres interrogativos como estaba previsto y los controles los domina bien. Tiene como ejercicios un par de documentos. De completar qué pronombre interrogativo es el mejor para la próxima clase. Debo buscar información sobre el bueno, bien bonito. Su palabra favorita en español. Es. Barandero. ¿Y la palabra? Favorita en húngaro es prietoda.`

const TC35_GERGANA_05MAY = `En la clase de hoy de las 10:00 H de la mañana. Hemos trabajado. Las descripciones de hemos seguido trabajando mi barrio, hemos trabajado mi barrio. Concretamente hemos hecho lo que está en la pizarra del 30 de abril. Que es relacionar los lugares. Relacionar los adjetivos. Vale y la página 104. Que es la de un barrio típico. Y relacionar los diferentes sitios que hay en el en el barrio y lo ha hecho muy bien para la clase de mañana día 6. Tenemos que. Continuar con la pizarra del día.`

const TC36_GERGANA_06MAY = `En la clase de hoy de las 11 hemos trabajado el barrio, hemos hecho el ser start ahí. Con el barrio de Albaicín también ejemplos cuando utilizar ser START y Ai. Hemos hecho el documento de Cachitos y tiene como deberes redactar sobre el barrio de Albaicín. Para la siguiente clase tengo que trabajar las preposiciones de lugar a la derecha, a la izquierda, arriba, abajo. Con el audio que hice con martón.`

let gerganaId: string
let hannaId: string
let gerganaSessionId: string
let hannaSessionId: string

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)

  const gergana = await createStudentViaApi(page, { name: 'Gergana', cefrLevel: 'B1' })
  gerganaId = gergana.id
  const hanna = await createStudentViaApi(page, { name: 'Hanna', cefrLevel: 'B1' })
  hannaId = hanna.id

  const today = new Date().toISOString()

  const gSess = await page.request.post(`${API_BASE}/api/students/${gerganaId}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: { sessionDate: today, title: 'Clase hoy' },
  })
  expect(gSess.ok()).toBeTruthy()
  gerganaSessionId = (await gSess.json()).id

  const hSess = await page.request.post(`${API_BASE}/api/students/${hannaId}/sessions`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: { sessionDate: today, title: 'Clase hoy' },
  })
  expect(hSess.ok()).toBeTruthy()
  hannaSessionId = (await hSess.json()).id

  await page.close()
  await ctx.close()
})

async function propose(browser: Parameters<typeof createMockAuthContext>[0], text: string, studentId: string, sessionId: string) {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  const res = await page.request.post(`${API_BASE}/api/assistant/propose`, {
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    data: { text, studentId, sessionId },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  await page.close()
  await ctx.close()
  return body.proposals as Array<{ type: string; field: string; newValue: string }>
}

// TC-33: Hanna — verbos de cambio + planning aside "para la próxima clase"
// Asserts: nextLessonIdeas proposal present; no teachingTodo from planning aside (#1126 regression)
test('TC-33: Hanna reflection emits nextLessonIdeas, not teachingTodo', async ({ browser }) => {
  const proposals = await propose(browser, TC33_HANNA, hannaId, hannaSessionId)

  const nextIdeas = proposals.filter(p => p.type === 'session' && p.field === 'nextSessionTopics')
  expect(nextIdeas.length, 'nextLessonIdeas proposal must be present').toBeGreaterThan(0)
  expect(nextIdeas[0].newValue, 'nextLessonIdeas must have content').toBeTruthy()

  const todos = proposals.filter(p => p.type === 'todo')
  expect(todos.length, 'planning aside must not become a teachingTodo').toBe(0)
})

// TC-34: Gergana 28-Apr — pronombres interrogativos
// Asserts: nextLessonIdeas and homeworkAssigned proposals present
test('TC-34: Gergana 28-Apr reflection emits nextLessonIdeas and homeworkAssigned', async ({ browser }) => {
  const proposals = await propose(browser, TC34_GERGANA_28APR, gerganaId, gerganaSessionId)

  const nextIdeas = proposals.filter(p => p.type === 'session' && p.field === 'nextSessionTopics')
  expect(nextIdeas.length, 'nextLessonIdeas proposal must be present').toBeGreaterThan(0)
  expect(nextIdeas[0].newValue, 'nextLessonIdeas must have content').toBeTruthy()

  const homework = proposals.filter(p => p.type === 'session' && p.field === 'homeworkAssigned')
  expect(homework.length, 'homeworkAssigned proposal must be present').toBeGreaterThan(0)
})

// TC-35: Gergana 05-May — mi barrio (original #1110 failure case)
// Asserts: nextLessonIdeas present; no extra newSession for 30-Apr past reference (#1110 regression)
test('TC-35: Gergana 05-May reflection emits nextLessonIdeas, no phantom newSession', async ({ browser }) => {
  const proposals = await propose(browser, TC35_GERGANA_05MAY, gerganaId, gerganaSessionId)

  const nextIdeas = proposals.filter(p => p.type === 'session' && p.field === 'nextSessionTopics')
  expect(nextIdeas.length, 'nextLessonIdeas proposal must be present').toBeGreaterThan(0)
  expect(nextIdeas[0].newValue, 'nextLessonIdeas must have content').toBeTruthy()

  const newSessions = proposals.filter(p => p.type === 'newSession')
  expect(newSessions.length, '30-Apr past reference must not produce a newSession proposal').toBe(0)
})

// TC-36: Gergana 06-May — Albaicín / ser-estar (happy-path real recording)
// Asserts: nextLessonIdeas and homeworkAssigned proposals present
test('TC-36: Gergana 06-May reflection emits nextLessonIdeas and homeworkAssigned', async ({ browser }) => {
  const proposals = await propose(browser, TC36_GERGANA_06MAY, gerganaId, gerganaSessionId)

  const nextIdeas = proposals.filter(p => p.type === 'session' && p.field === 'nextSessionTopics')
  expect(nextIdeas.length, 'nextLessonIdeas proposal must be present').toBeGreaterThan(0)
  expect(nextIdeas[0].newValue, 'nextLessonIdeas must have content').toBeTruthy()

  const homework = proposals.filter(p => p.type === 'session' && p.field === 'homeworkAssigned')
  expect(homework.length, 'homeworkAssigned proposal must be present').toBeGreaterThan(0)
})
