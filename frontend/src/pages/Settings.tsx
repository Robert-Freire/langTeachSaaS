import { useEffect, useState } from 'react'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import { logger } from '../lib/logger'

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other']
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const STYLES = ['Formal', 'Conversational', 'Exam-prep']

export default function Settings() {
  const { data: profile, isLoading } = useProfile()
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

  if (isLoading) return <p>Loading...</p>

  return (
    <div className="settings-page">
      <h1>My Profile</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="displayName">Display Name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={100}
            required
          />
        </div>

        <fieldset>
          <legend>Languages I Teach</legend>
          {LANGUAGES.map(lang => (
            <label key={lang}>
              <input
                type="checkbox"
                value={lang}
                checked={teachingLanguages.includes(lang)}
                onChange={() => toggleItem(teachingLanguages, setTeachingLanguages, lang)}
              />
              {lang}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>CEFR Levels I Teach</legend>
          {CEFR_LEVELS.map(level => (
            <label key={level}>
              <input
                type="checkbox"
                value={level}
                checked={cefrLevels.includes(level)}
                onChange={() => toggleItem(cefrLevels, setCefrLevels, level)}
              />
              {level}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Preferred Content Style</legend>
          {STYLES.map(style => (
            <label key={style}>
              <input
                type="radio"
                name="preferredStyle"
                value={style}
                checked={preferredStyle === style}
                onChange={() => setPreferredStyle(style)}
              />
              {style}
            </label>
          ))}
        </fieldset>

        <button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Profile'}
        </button>

        {isSuccess && <span className="save-success">Saved</span>}
        {isError && <span className="save-error">Save failed. Please try again.</span>}
      </form>
    </div>
  )
}
