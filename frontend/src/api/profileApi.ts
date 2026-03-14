import { apiClient } from '../lib/apiClient'
import type { ProfileDto, UpdateProfileRequest } from '../types/profile'

export const getProfile = (): Promise<ProfileDto> =>
  apiClient.get('/api/profile').then(r => r.data)

export const updateProfile = (req: UpdateProfileRequest): Promise<ProfileDto> =>
  apiClient.put('/api/profile', req).then(r => r.data)
