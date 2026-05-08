import { useEffect, useState } from 'react'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import { logger } from '../lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { SelectionChip } from '@/components/SelectionChip'
import { CEFR_LEVELS } from '@/lib/cefr-colors'
import { LANGUAGES } from '@/lib/languages'
import { TelegramCard } from '@/components/settings/TelegramCard'

const STYLES = ['Formal', 'Conversational', 'Exam-prep']

export default function Settings() {
  const { data: profile, isLoading, isError: isProfileError } = useProfile()
  const { mutate, isPending, isSuccess, isError, reset } = useUpdateProfile()
  const [validationError, setValidationError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [teachingLanguages, setTeachingLanguages] = useState<string[]>([])
  const [cefrLevels, setCefrLevels] = useState<string[]>([])
  const [preferredStyle, setPreferredStyle] = useState('Conversational')

  useEffect(() => {
    logger.info('Settings', 'settings page loaded')
  }, [])

  // Sync server profile to local form state
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName)
      setTeachingLanguages(profile.teachingLanguages)
      setCefrLevels(profile.cefrLevels)
      setPreferredStyle(profile.preferredStyle)
    }
  }, [profile])
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleItem(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(x => x !== value) : [...list, value])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    logger.info('Settings', 'profile save submitted')

    if (!displayName.trim()) {
      reset()
      setValidationError('Display Name is required.')
      return
    }

    if (displayName.includes('<') || displayName.includes('>')) {
      reset()
      setValidationError('Display name must not contain < or > characters.')
      return
    }

    setValidationError(null)
    mutate(
      { displayName, teachingLanguages, cefrLevels, preferredStyle },
      {
        onSuccess: () => logger.info('Settings', 'profile save succeeded'),
        onError: (err) => logger.error('Settings', 'profile save failed', err),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full max-w-sm" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isProfileError) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">Failed to load profile. Please try again.</span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure how you appear to students and set your teaching preferences."
        actions={
          <div className="flex items-center gap-3">
            {validationError && (
              <span className="text-sm text-red-600 font-medium" data-testid="validation-error">{validationError}</span>
            )}
            {!validationError && isSuccess && (
              <span className="text-sm text-emerald-600 font-medium" data-testid="save-success">Saved successfully</span>
            )}
            {!validationError && isError && (
              <span className="text-sm text-red-600 font-medium">Save failed. Please try again.</span>
            )}
            <Button type="submit" form="profile-form" disabled={isPending}>
              {isPending ? 'Saving...' : 'Done'}
            </Button>
          </div>
        }
      />

      <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Display Name</CardTitle>
            <CardDescription>This is the name students will see.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Name</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={100}
                aria-required="true"
                placeholder="e.g. María García"
                className="max-w-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Languages I Teach</CardTitle>
            <CardDescription>Select all languages you offer lessons in.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <SelectionChip
                  key={lang}
                  label={lang}
                  selected={teachingLanguages.includes(lang)}
                  onToggle={() => toggleItem(teachingLanguages, setTeachingLanguages, lang)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CEFR Levels I Teach</CardTitle>
            <CardDescription>Select the proficiency levels you cover.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CEFR_LEVELS.map(level => (
                <SelectionChip
                  key={level}
                  label={level}
                  selected={cefrLevels.includes(level)}
                  onToggle={() => toggleItem(cefrLevels, setCefrLevels, level)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferred Content Style</CardTitle>
            <CardDescription>This guides how lesson content is generated for your students.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {STYLES.map(style => (
                <SelectionChip
                  key={style}
                  label={style}
                  selected={preferredStyle === style}
                  onToggle={() => setPreferredStyle(style)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
          <CardDescription>Connect external services to Atelier.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-700">Telegram</h3>
            <TelegramCard />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
