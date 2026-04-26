import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractStudentProfile } from './studentExtraction'
import { apiClient } from '../lib/apiClient'

vi.mock('../lib/apiClient', () => ({
  apiClient: { post: vi.fn() },
}))

const mockPost = vi.mocked(apiClient.post)

describe('extractStudentProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('posts to extract-profile and returns result', async () => {
    const response = { cefrLevel: 'B1', profession: null, nativeLanguages: [], spokenLanguages: [], interests: [], shortTermObjectives: [], difficulties: [], teachingTodoTexts: [], name: null, birthYear: null, countryOfResidence: null, cityOfResidence: null, reasonForStudying: null, officialCefrLevel: null }
    mockPost.mockResolvedValue({ data: response })

    const result = await extractStudentProfile('Student is a B1 level teacher.')
    expect(mockPost).toHaveBeenCalledWith('/api/students/extract-profile', { text: 'Student is a B1 level teacher.' })
    expect(result).toEqual(response)
  })
})
