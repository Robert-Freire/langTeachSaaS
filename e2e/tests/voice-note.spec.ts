import { test, expect } from '@playwright/test'
import { createMockAuthContext } from '../helpers/auth-helper'
import { setupMockTeacher } from '../helpers/mock-teacher-helper'
import path from 'path'

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

test.beforeAll(async ({ browser }) => {
  const ctx = await createMockAuthContext(browser)
  const page = await ctx.newPage()
  await setupMockTeacher(page)
  await page.close()
  await ctx.close()
})

test('upload voice note: transcription returned and editable', async ({ browser }) => {
  const context = await createMockAuthContext(browser)
  const page = await context.newPage()

  // Upload audio file directly via API
  const audioPath = path.join(__dirname, '../fixtures/test-audio.webm')
  const uploadRes = await page.request.post(`${API_BASE}/api/voice-notes`, {
    headers: { Authorization: 'Bearer test-token' },
    multipart: {
      file: {
        name: 'test-audio.webm',
        mimeType: 'audio/webm',
        buffer: require('fs').readFileSync(audioPath),
      },
    },
  })

  expect(uploadRes.ok()).toBeTruthy()
  const note = await uploadRes.json()

  expect(note.id).toBeDefined()
  expect(note.transcribedAt).not.toBeNull()
  expect(note.transcription).toBe('[Test transcription]')
  expect(note.originalFileName).toBe('test-audio.webm')

  // Retrieve the note
  const getRes = await page.request.get(`${API_BASE}/api/voice-notes/${note.id}`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  expect(getRes.ok()).toBeTruthy()
  const fetched = await getRes.json()
  expect(fetched.transcription).toBe('[Test transcription]')

  // Edit transcription
  const editedText = 'Today we practiced the subjunctive.'
  const patchRes = await page.request.patch(
    `${API_BASE}/api/voice-notes/${note.id}/transcription`,
    {
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      data: { transcription: editedText },
    },
  )
  expect(patchRes.ok()).toBeTruthy()
  const patched = await patchRes.json()
  expect(patched.transcription).toBe(editedText)

  // Verify persisted
  const verifyRes = await page.request.get(`${API_BASE}/api/voice-notes/${note.id}`, {
    headers: { Authorization: 'Bearer test-token' },
  })
  expect(verifyRes.ok()).toBeTruthy()
  const verified = await verifyRes.json()
  expect(verified.transcription).toBe(editedText)

  await page.close()
  await context.close()
})
