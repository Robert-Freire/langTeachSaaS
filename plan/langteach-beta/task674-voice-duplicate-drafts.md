# Task 674 — Fix: voice recording creates duplicate drafts

## Problem

`handleVoiceNote` in `SessionLogDialog.tsx` (line 411) always calls `createSession(..., status: 'Draft')`,
regardless of whether:
- A draft was already created by a previous voice note (`draftSessionId` is set), or
- The dialog is open in edit mode (editing an existing session).

This causes two bugs:
1. A second voice note on the same create-mode form creates a second Draft session.
2. A voice note while editing an existing session (including a Confirmed one) creates a new Draft
   instead of updating the existing session.

Additionally, field merging is currently "replace, not append": a second voice note overwrites
what the first extracted, instead of appending narrative fields and unioning list fields.

## Scope

**Frontend only.** The backend `updateSession` endpoint already accepts the full payload and supports
all necessary fields (including `status`). No backend changes required.

## Changes

### 1. Helper functions (add near top of `SessionLogDialog.tsx`)

```ts
function mergeNarrative(existing: string, extracted: string): string {
  const a = existing.trim()
  const b = extracted.trim()
  if (!a) return b
  if (!b || a === b) return a
  return `${a}\n${b}`
}

function mergeTopicTagsUnion(existing: TopicTag[], extracted: TopicTag[]): TopicTag[] {
  const seen = new Set(existing.map(t => t.tag.toLowerCase()))
  return [...existing, ...extracted.filter(t => !seen.has(t.tag.toLowerCase()))]
}

function mergeSuggestedDifficulties(
  existing: SuggestedDifficulty[],
  extracted: SuggestedDifficulty[],
): SuggestedDifficulty[] {
  const seen = new Set(existing.map(d => `${d.competency}|${d.subcategory}`))
  return [...existing, ...extracted.filter(d => !seen.has(`${d.competency}|${d.subcategory}`))]
}
```

### 2. Rewrite `handleVoiceNote`

**Step A — Compute merged values before calling setState** (avoids async state read issues):

```ts
const notes = [extracted.areasToImprove, extracted.emotionalSignals].filter(Boolean).join('\n')
const mergedActualContent  = mergeNarrative(actualContent, extracted.whatWasCovered ?? '')
const mergedHomework       = mergeNarrative(homeworkAssigned, extracted.homeworkAssigned ?? '')
const mergedNextTopics     = mergeNarrative(nextSessionTopics, extracted.nextLessonIdeas ?? '')
const mergedNotes          = mergeNarrative(generalNotes, notes)
const mergedTopicTags      = mergeTopicTagsUnion(topicTags, extracted.topicTags ?? [])
const mergedDifficulties   = mergeSuggestedDifficulties(suggestedDifficulties, extracted.suggestedDifficulties ?? [])
```

**Step B — Apply merged values to state:**

```ts
setActualContent(mergedActualContent)
setHomeworkAssigned(mergedHomework)
setNextSessionTopics(mergedNextTopics)
setGeneralNotes(mergedNotes)
setTopicTags(mergedTopicTags)
setSuggestedDifficulties(mergedDifficulties)
// sessionDate, isCancelled, levelReassessment, difficulties: unchanged behaviour
```

**Step C — Determine target session and save:**

```ts
const targetSessionId = isEditMode ? initialSession!.id : draftSessionId

const resolvedDate     = sessionDateRef.current || extracted.sessionDate || null
const resolvedPrevHw   = extracted.previousHomeworkStatus ?? prevHomeworkStatus
const resolvedCancelled = extracted.isCancelled === true ? true : isCancelled
const isConfirmed      = isEditMode && initialSession!.statusName === 'Confirmed'
const resolvedStatus   = isConfirmed ? 'Confirmed' : 'Draft'

const payload = {
  sessionDate: resolvedDate,
  plannedContent: plannedContent || null,
  actualContent: mergedActualContent || null,
  homeworkAssigned: mergedHomework || null,
  previousHomeworkStatus: resolvedPrevHw,
  nextSessionTopics: mergedNextTopics || null,
  generalNotes: mergedNotes || null,
  levelReassessmentSkill: resolvedLevelEnabled ? reassessmentSkill || null : null,
  levelReassessmentLevel: resolvedLevelEnabled ? reassessmentLevel || null : null,
  linkedLessonId: selectedLessonId || null,
  topicTags: mergedTopicTags.length > 0 ? serializeTopicTags(mergedTopicTags) : null,
  isCancelled: resolvedCancelled,
  duration: extracted.durationMinutes ?? null,
  status: resolvedStatus,
  suggestedDifficulties: mergedDifficulties.length > 0 ? mergedDifficulties : undefined,
  voiceNoteId: voiceNote.id,
  voiceNoteTranscription: voiceNote.transcription ?? undefined,
  rawExtractionJson: extracted.rawExtractionJson ?? undefined,
}

let savedSessionId: string
if (targetSessionId) {
  await updateSession(studentId, targetSessionId, payload)
  savedSessionId = targetSessionId
} else {
  const draft = await createSession(studentId, payload)
  setDraftSessionId(draft.id)
  savedSessionId = draft.id
}
```

**Step D — Teaching todos and followups** (link to the correct session):

```ts
if (extracted.teachingTodos?.length) {
  // unchanged: append todos to student record
}
if (extracted.teacherFollowups?.length) {
  // use savedSessionId (not draft.id which is only available in the create path)
  extracted.teacherFollowups.map(text =>
    createFollowup({ text, studentId, sourceSessionLogId: savedSessionId })
  )
}
```

## Acceptance criteria verification

| AC | How it is met |
|----|---------------|
| Voice in create mode creates Draft (no regression) | `!isEditMode && !draftSessionId` → `createSession(..., status: 'Draft')` |
| Voice in edit mode merges into existing form state | `isEditMode` → `updateSession(initialSession.id, ...)` |
| Narrative fields appended with `\n` separator | `mergeNarrative()` helper |
| List fields unioned (no duplicates) | `mergeTopicTagsUnion()`, `mergeSuggestedDifficulties()` |
| Second voice note appends/merges | `draftSessionId` is set after first; second note calls `updateSession` |
| Voice on confirmed session auto-confirms | `resolvedStatus = 'Confirmed'` when `initialSession.statusName === 'Confirmed'` |
| No duplicate Draft sessions | `targetSessionId` branches: update if exists, create only when both are null |

## Tests to add (unit)

In `SessionLogDialog.test.tsx`:

1. **`voice note in create mode creates a Draft session`** — existing mock triggers voice note,
   verify `createSession` called with `status: 'Draft'`.

2. **`second voice note in create mode updates the draft, not creates a new session`** — trigger
   voice note twice; verify `createSession` called once, `updateSession` called once with
   `draftSessionId`.

3. **`voice note in edit mode calls updateSession on initialSession, not createSession`** — open
   in edit mode, trigger voice note; verify `updateSession` called with `initialSession.id` and
   `createSession` NOT called.

4. **`voice note in edit mode on confirmed session keeps Confirmed status`** — `initialSession.statusName = 'Confirmed'`;
   verify `updateSession` called with `status: 'Confirmed'`.

5. **`second voice note appends narrative fields, not replaces`** — pre-fill `actualContent`;
   mock two different extraction results; trigger voice note; verify merged text contains both.

6. **`voice note unions topic tags, no duplicates`** — initial tags + extracted tags with overlap;
   verify result has union.

## E2E coverage

Add a test in `e2e/tests/students.spec.ts` under a `voice note session logging` group:
- Open the SessionLogDialog for a student
- Trigger voice note (mock the recorder via the same approach used for LogSession)
- Confirm that only one Draft session exists after two voice notes

Note: The AudioRecorder is hard to drive in e2e without browser audio access. Use the existing
e2e pattern: set `VITE_E2E_TEST_MODE=true` stub or check how `LogSession.spec.ts`/`log-session.visual.spec.ts`
handle voice in e2e context to decide approach.

## Additional change: AudioRecorder render guard

**Current condition** (line 552):
```tsx
{!isEditMode && !draftSessionId && (
  <div data-testid="voice-recorder-section">...
```

This hides the recorder in edit mode entirely, and hides it after the first voice note in create mode. Both constraints prevent the AC scenarios from being reachable. Change to:
```tsx
{(
  <div data-testid="voice-recorder-section">...
```
i.e., remove the guard entirely. The recorder is already inside the `!success` block. The
`isExtracting` state already handles preventing concurrent recordings (shows spinner instead of
recorder while extraction is running).

**Note on topicTags guard** (line 378): The current code `if (extracted.topicTags?.length && topicTags.length === 0) setTopicTags(...)` is replaced by the union merge. For a fresh form this is equivalent (mergeTopicTagsUnion([], extracted) = extracted). For an existing form (edit mode or second voice note), the union is the correct new behaviour. Existing tests that rely on the length-0 guard will continue to pass since they start with `topicTags = []`.

**Note on resolvedLevelEnabled** (line 407 naming): Use existing variable `reassessmentEnabled` directly (not `resolvedLevelEnabled` which does not exist). Plan Step C corrects this.

**Note on savedSessionId scope** (Step D): Declare `savedSessionId` before the `if (targetSessionId)` branch so it is in scope for the followup creation in both paths.

## E2E approach

Voice note e2e is not easily testable via the real AudioRecorder (browser audio permission required). Use the approach from `e2e/tests/visual/log-session.visual.spec.ts`: check whether an existing e2e stub or mock audio approach is already present. If not, add a focused test that:
- Opens the SessionLogDialog (via students page "Log Session" button)
- Verifies the voice recorder section is visible in edit mode (new) and in create mode after a draft exists

If driving the AudioRecorder itself is not feasible in e2e, defer with a GitHub issue (create it before PR). Do not leave E2E coverage unresolved.

## Files to change

| File | Change |
|------|--------|
| `frontend/src/components/session/SessionLogDialog.tsx` | Remove AudioRecorder render guard; add 3 helpers; rewrite `handleVoiceNote` merge/save logic |
| `frontend/src/components/session/SessionLogDialog.test.tsx` | Add 6 unit tests for voice note scenarios |
| `e2e/tests/students.spec.ts` | Add voice recorder visibility test; defer extraction test with issue if needed |
