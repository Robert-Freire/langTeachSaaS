import { apiClient } from '../lib/apiClient'
import type { ProfileDto, UpdateProfileRequest } from '../types/profile'

export async function getProfile(): Promise<ProfileDto> {
  const res = await apiClient.get<ProfileDto>('/api/profile')
  return res.data
}

export async function updateProfile(req: UpdateProfileRequest): Promise<ProfileDto> {
  const res = await apiClient.put<ProfileDto>('/api/profile', req)
  return res.data
}

export async function completeOnboarding(): Promise<void> {
  await apiClient.post('/api/profile/complete-onboarding')
}
