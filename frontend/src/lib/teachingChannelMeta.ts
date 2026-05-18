import { Globe, Video, Building2, type LucideIcon } from 'lucide-react'

export interface TeachingChannelMeta {
  icon: LucideIcon
  label: string
}

export const TEACHING_CHANNEL_META: Record<string, TeachingChannelMeta> = {
  Preply:     { icon: Globe,      label: 'Preply' },
  Meet:       { icon: Video,      label: 'Meet' },
  Presencial: { icon: Building2,  label: 'Presencial' },
}

export const TEACHING_CHANNEL_OPTIONS = ['Preply', 'Meet', 'Presencial'] as const
export type TeachingChannelValue = typeof TEACHING_CHANNEL_OPTIONS[number]
