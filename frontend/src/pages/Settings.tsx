import { useEffect, useState } from 'react'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import { logger } from '../lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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

export default function Settings() {
  const { data: profile, isLoading, isError: isProfileError } = useProfile()
  const { mutate, isPending, isSuccess, isError } = useUpdateProfile()

  const [displayName, setDisplayName] = useState('')
  const [teachingLanguages, setTeachingLanguages] = useState<string[]>([])
  const [cefrLevels, setCefrLevels] = useState<string[]>([])
  const [preferredStyle, setPreferredStyle] = useState('Conversational')

  useEffect(() => {
    logger.info('Settings', 'settings page loaded')
  }, [])

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName)
      setTeachingLanguages(profile.teachingLanguages)
      setCefrLevels(profile.cefrLevels)
      setPreferredStyle(profile.preferredStyle)
    }
  }, [profile])

  function toggleItem(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(x => x !== value) : [...list, value])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    logger.info('Settings', 'profile save submitted')
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
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">My Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">Configure how you appear to students and set your teaching preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                required
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
                <ToggleBadge
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
                <ToggleBadge
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
                <button
                  key={style}
                  type="button"
                  onClick={() => setPreferredStyle(style)}
                  aria-pressed={preferredStyle === style}
                >
                  <Badge
                    variant={preferredStyle === style ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer select-none transition-colors text-sm px-3 py-1',
                      preferredStyle === style
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-indigo-400 hover:text-indigo-600'
                    )}
                  >
                    {style}
                  </Badge>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-zinc-100">
              <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {isPending ? 'Saving...' : 'Save Profile'}
              </Button>
              {isSuccess && (
                <span className="text-sm text-emerald-600 font-medium" data-testid="save-success">Saved successfully</span>
              )}
              {isError && (
                <span className="text-sm text-red-600 font-medium">Save failed. Please try again.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
