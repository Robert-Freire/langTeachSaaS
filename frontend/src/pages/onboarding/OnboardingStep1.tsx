import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useProfile, useUpdateProfile } from '../../hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other']
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const STYLES = ['Formal', 'Conversational', 'Exam-prep']

function ToggleBadge({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={selected}>
      <Badge
        variant={selected ? 'default' : 'outline'}
        className={cn(
          'cursor-pointer select-none transition-colors text-sm px-3 py-1',
          selected
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
            : 'bg-white text-zinc-600 border-zinc-200 hover:border-indigo-400 hover:text-indigo-600'
        )}
      >
        {label}
      </Badge>
    </button>
  )
}

interface OnboardingStep1Props {
  onNext: () => void
}

export default function OnboardingStep1({ onNext }: OnboardingStep1Props) {
  const { user } = useAuth0()
  const { data: profile } = useProfile()
  const { mutate, isPending } = useUpdateProfile()

  const [displayName, setDisplayName] = useState('')
  const [teachingLanguages, setTeachingLanguages] = useState<string[]>([])
  const [cefrLevels, setCefrLevels] = useState<string[]>([])
  const [preferredStyle, setPreferredStyle] = useState('Conversational')
  const [error, setError] = useState<string | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || user?.name || '')
      setTeachingLanguages(profile.teachingLanguages)
      setCefrLevels(profile.cefrLevels)
      setPreferredStyle(profile.preferredStyle)
    } else if (user?.name) {
      setDisplayName(user.name)
    }
  }, [profile, user])
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleItem(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(x => x !== value) : [...list, value])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!displayName.trim()) {
      setError('Please enter your name.')
      return
    }

    mutate(
      { displayName: displayName.trim(), teachingLanguages, cefrLevels, preferredStyle },
      { onSuccess: () => onNext(), onError: () => setError('Failed to save. Please try again.') }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="onboarding-step-1">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Set up your profile</h2>
        <p className="text-sm text-zinc-500 mt-1">Tell us about yourself so we can personalize your experience.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="displayName">Your name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          maxLength={100}
          placeholder="e.g. Maria Garcia"
          className="max-w-sm"
          data-testid="onboarding-display-name"
        />
      </div>

      <div className="space-y-2">
        <Label>Languages I teach</Label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <ToggleBadge
              key={lang}
              label={lang}
              selected={teachingLanguages.includes(lang)}
              onToggle={() => toggleItem(teachingLanguages, setTeachingLanguages, lang)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>CEFR levels I teach</Label>
        <div className="flex flex-wrap gap-2">
          {CEFR_LEVELS.map(level => (
            <ToggleBadge
              key={level}
              label={level}
              selected={cefrLevels.includes(level)}
              onToggle={() => toggleItem(cefrLevels, setCefrLevels, level)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preferred content style</Label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map(style => (
            <ToggleBadge
              key={style}
              label={style}
              selected={preferredStyle === style}
              onToggle={() => setPreferredStyle(style)}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600" data-testid="step1-error">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700" data-testid="onboarding-next">
          {isPending ? 'Saving...' : 'Next'}
        </Button>
      </div>
    </form>
  )
}
