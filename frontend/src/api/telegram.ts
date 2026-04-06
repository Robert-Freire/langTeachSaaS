import { apiClient } from '../lib/apiClient'

export interface TelegramStatus {
  connected: boolean
  linkedAt: string | null
}

export interface TelegramConnectCode {
  code: string
  expiresAt: string
}

export async function getTelegramStatus(): Promise<TelegramStatus> {
  const res = await apiClient.get<TelegramStatus>('/api/telegram/status')
  return res.data
}

export async function generateConnectCode(): Promise<TelegramConnectCode> {
  const res = await apiClient.post<TelegramConnectCode>('/api/telegram/connect-code')
  return res.data
}

export async function deleteTelegramLink(): Promise<void> {
  await apiClient.delete('/api/telegram/link')
}
