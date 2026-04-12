# Task #672: Log Session Redesign

**Issue:** https://github.com/Robert-Freire/langTeachSaaS/issues/672
**Sprint:** ui-redesign-student-polish
**Branch:** worktree-task-t672-log-session-redesign

---

## Summary

Replace the `SessionLogDialog` modal with a full-page two-column layout at
`/students/:id/log-session`. The existing `SessionLogDialog` remains in place for
edit-session flows in SessionHistoryTab. Only the "Log Session" (create new) entry
point moves to the full page.

---

## Design References

- Screen: `plan/langteach-beta/stitch-design-system/session-edit/screen.png`
- Code: `plan/langteach-beta/stitch-design-system/session-edit/code.html`
- Design spec: `plan/langteach-beta/stitch-design-system/session-edit/DESIGN.md`
- Field mapping: `plan/langteach-beta/student-screen-field-mapping.md` (Log Session section)

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `frontend/src/pages/LogSession.tsx` | Full-page log session component |
| `frontend/src/pages/LogSession.test.tsx` | Unit tests |

### Modified files

| File | Change |
|---|---|
| `frontend/src/App.tsx` | Add route `/students/:id/log-session` -> `<LogSession />` |
| `frontend/src/pages/StudentDetail.tsx` | "Log Session" button -> `navigate('/students/:id/log-session')` |
| `frontend/src/api/sessionLogs.ts` | Add `duration?: number \| null` to `CreateSessionLogRequest` and `SessionLog` |
| `frontend/src/api/students.ts` | Add `coveredInSessionLogId?: string \| null` to `updateTeachingTodo` type |
| `e2e/tests/students.spec.ts` | Add e2e happy-path test for log session page |

---

## LogSession.tsx Structure

### Data fetching (all on mount, no modal open/close gating)

```
getStudent(id)           -> student data (name, CEFR, todos, objectives, difficulties)
listSessions(id)         -> sessions (prev session, session count)
getFollowups(id)         -> pending followups filtered to this student
getLessons({ studentId }) -> for linked lesson dropdown
```

Derived values:
- `prevSession = sessions[0] ?? null` (most recent non-cancelled for display)
- `sessionNumber = sessions.filter(s => !s.isCancelled).length + 1`
- `plannedForToday = prevSession?.nextSessionTopics ?? null`
- `pendingFollowups = followups.filter(f => f.status === 'pending')`

### Local state

| State | Type | Purpose |
|---|---|---|
| `sessionDate` | string | defaults to today |
| `duration` | number \| null | defaults to 60 |
| `durationOther` | string | shown when duration = 'other' |
| `isCancelled` | boolean | cancelled toggle |
| `actualContent` | string | "What Happened?" textarea, pre-filled from plannedForToday |
| `prevHomeworkStatus` | string | 'Done'/'Partial'/'NotDone'/'NotApplicable' |
| `homeworkAssigned` | string | |
| `nextSessionTopics` | string | |
| `generalNotes` | string | "Today's Context" |
| `topicTags` | TopicTag[] | |
| `reassessmentEnabled` | boolean | |
| `reassessmentLevel` | string | |
| `selectedLessonId` | string | |
| `checkedTodoIds` | Set<string> | checked in left panel (applied on submit) |
| `checkedFollowupIds` | Set<string> | followups checked in left panel -> mark done on submit |
| `mentionedDifficultyKeys` | Set<string> | active difficulties worked on today (`competency|subcategory`) |
| `newTodos` | string[] | quick-add list |
| `newFollowups` | string[] | quick-add list |
| `errors` | Record<string, string> | validation |
| `isSubmitting` | boolean | |
| `submitError` | string \| null | |

### Layout

```
<AppShell>
  <div class="two-column-layout">
    <aside class="w-[35%] left-panel">  /* Student Context */
    <main class="w-[65%] right-panel"> /* Session Log Form */
  </div>
</AppShell>
```

**Left panel sections (top to bottom):**
1. Student header: avatar initials, name, CEFR badge, native language(s), session number
2. Short-term objectives: all where status=active, overdue flagged amber
3. Teaching Todos: pending todos as checkboxes (local state `checkedTodoIds`)
4. Pending Followups: amber dots, checkable (updates `checkedFollowupIds`)
5. Last Session: date, summary snippet, homework status
6. Planned for Today: prevSession.nextSessionTopics (indigo-50 bg, hidden if null)
7. Active Difficulties: checkable -> populates `mentionedDifficultyKeys`

**Right panel fields (top to bottom):**
1. Header row: Date input + Duration dropdown (30/45/60/90/Other) + Cancelled toggle
2. Previous Homework Status (Done/Partial/Not Done) - only if prev session had homework
3. "What Happened?" textarea (pre-filled from plannedForToday) + read-only reference line below
4. Voice note / audio (AudioRecorder + upload)
5. Homework Assigned input
6. Next Session textarea
7. Teaching Todos quick-add (indigo tint)
8. Pending Followups quick-add (amber-50 tint)
9. Topics Covered (TopicTagsInput)
10. Today's Context textarea
11. Link to Lesson Plan dropdown
12. Level Reassessment toggle + CEFR dropdown (when enabled)
13. Footer: Cancel button (ghost, navigate back) + Log Session (primary gradient)

### Duration dropdown behavior

- Choices: 30, 45, 60, 90, Other
- Default: 60
- "Other" selected -> reveal `<input type="number">` for custom minutes
- Final value: `duration = durationOther ? parseInt(durationOther) : selectedDuration`

### Submit sequence

On "Log Session" click:
1. Validate: sessionDate required (warn but allow if cancelled)
2. `createSession(studentId, payload)` -> get `savedSession`
3. For each `todoId` in `checkedTodoIds`:
   `updateTeachingTodo(studentId, todoId, { status: 'Covered', coveredInSessionLogId: savedSession.id })`
4. For each `todoId` in `checkedFollowupIds`:
   `updateFollowupStatus(todoId, 'done')`
5. For each text in `newTodos`:
   `appendTeachingTodo(studentId, text)`
6. For each text in `newFollowups`:
   `createFollowup({ text, studentId, sourceSessionLogId: savedSession.id })`
7. Invalidate queries: `['sessions', studentId]`, `['student', studentId]`, `['followups', studentId]`
   (followups query key must match `getFollowups(studentId)` call key exactly)
8. `navigate('/students/:id')`

Steps 3-6 can run in parallel (Promise.all) since they are independent.

If createSession fails, show error, do not proceed. Steps 3-6 failures are best-effort
(log to console, do not block navigation).

### Cancelled toggle behavior

When `isCancelled = true`:
- Hide "What Happened?", Homework Assigned, Next Session, Teaching Todos quick-add
- Hide Previous Homework Status
- Keep: Date, Duration, Today's Context (for notes on why cancelled)
- Submit label remains "Log Session"

---

## Type changes

### `frontend/src/api/sessionLogs.ts`

Add to `SessionLog` interface:
```ts
duration: number | null   // confirmed in backend SessionLogDto (int? Duration, migration 20260411170833)
```

Add to `CreateSessionLogRequest`:
```ts
duration?: number | null
```

`previousHomeworkStatus` in `CreateSessionLogRequest` is `string` (enum name) - the backend uses
`JsonStringEnumConverter` so it accepts "Done", "Partial", "NotDone", "NotApplicable". No mapping needed.
The response field `previousHomeworkStatus` is a number (enum value) but we only use
`previousHomeworkStatusName` (string) for display. Existing pattern is correct.

### `frontend/src/api/students.ts`

Update `updateTeachingTodo` update type:
```ts
update: { status: string; text?: string; coveredInSessionLogId?: string | null }
```

---

## E2E Test

File: `e2e/tests/students.spec.ts` (new describe block `log session page`)

Scenario (student: Ana Seed, who has rich seeded data including sessions and todos):
1. Navigate to `/students/:id` for Ana
2. Click "Log Session" button
3. Assert URL is `/students/:id/log-session`
4. Assert left panel shows student name and CEFR badge
5. Fill "What Happened?" with test text
6. Click "Log Session"
7. Assert redirected back to `/students/:id`
8. Assert sessions list shows new entry (Sessions tab)

---

## Unit Tests (LogSession.test.tsx)

- Renders left panel with student name, CEFR badge, session number
- Renders right panel with form fields (date defaults to today, duration defaults to 60)
- "Other" duration reveals number input
- Checked todo reflected in local state
- Form submit calls createSession with correct payload
- Navigate back on success
- Shows error message on createSession failure
- Cancelled toggle hides irrelevant fields

---

## Out of Scope

- Voice note recording / transcription extraction: reuse same AudioRecorder component,
  but AI extraction on voice is deferred (complex state machine, separate issue if needed)
- Edit existing session via this page: SessionLogDialog handles that
- Duration field on SessionLogDialog (edit mode): deferred, not part of this AC

---

## AC Checklist

- [ ] Full page at `/students/:id/log-session`
- [ ] Left context panel: all student context sections per field mapping
- [ ] Right form: all session fields including duration and previousHomeworkStatus
- [ ] Date defaults to today, duration defaults to 60 min
- [ ] "Planned for today" pre-populates "What Happened?" from prev session nextSessionTopics
- [ ] TeachingTodos checkable (applied on submit)
- [ ] Pending followups checkable in context panel (applied on submit)
- [ ] New TeachingTodos quick-add saves to student backlog on submit
- [ ] New Followups quick-add saves to teacher followup tray on submit
- [ ] previousHomeworkStatus field present (Done/Partial/Not Done)
- [ ] Cancelled toggle changes form behavior
- [ ] Session number auto-calculated (excluding cancelled)
- [ ] Follows Stitch design
