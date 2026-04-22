# Task 797 — Student Detail: header density, badge styling, session titles, border cleanup

**Issue:** #797  
**Sprint branch:** sprint/ui-redesign-student-polish  
**Area:** frontend, design

---

## Context

Vera review of `/students/:id` (all 4 tabs). Structural issues only — no backend gap. All 5 ACs are purely frontend changes plus a seed data camelCase fix for topicTags.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/pages/StudentDetail.tsx` | F1 (header), F2 (badges) |
| `frontend/src/lib/sessionUtils.ts` | F3 (topicTags title fallback) |
| `frontend/src/lib/sessionUtils.test.ts` | F3 (new unit tests) |
| `frontend/src/components/session/SessionHistoryTab.tsx` | F4 (edit link) |
| `frontend/src/components/session/SessionHistoryTab.test.tsx` | F4 (unit test) |
| `frontend/src/components/student/LessonHistoryCard.tsx` | F5 (borders) |
| `frontend/src/components/student/ProgressDashboard.tsx` | F5 (borders) |
| `frontend/src/components/student/StudentCoursesCard.tsx` | F5 (borders) |
| `frontend/src/components/student/StudentProfileOverview.tsx` | F5 (borders) |
| `backend/LangTeach.Api/Data/ScenarioSeeder.cs` | F3 (topicTags camelCase fix) |
| `e2e/tests/student-detail.spec.ts` | F4 (e2e test) |

---

## Implementation Plan

### F1 — Header density (StudentDetail.tsx)

**Current state:** Name on line 1, identitySubtitle on line 2 (e.g. "German speaker · Engineer, Berlin"), then a metadata row with CefrBadge + learningLanguage + nativeLanguages + location.

**Changes:**

1. Modify `buildIdentitySubtitle` (line 32) to fold learning language into the first part:
   - If nativeLanguages present: `"German speaker, learning English"` (replaces just `"German speaker"`)
   - If no native: `"Learning English"`
   - Then append profession/city as before: `"German speaker, learning English · Engineer, Berlin"`

2. Wrap the `<h1>` in a flex container and add `CefrBadge level={student.cefrLevel}` inline to the right:
   ```jsx
   <div className="flex items-center gap-2 flex-wrap">
     <h1 className="font-manrope text-[1.75rem] font-bold text-[#1A1B22] leading-tight truncate" ...>
       {student.name}
     </h1>
     <CefrBadge level={student.cefrLevel} data-testid="cefr-badge" />
     {student.officialCefrLevel && (
       <span data-testid="official-cefr-badge" className="inline-flex items-center gap-1">
         <span className="text-[0.6875rem] text-zinc-500 uppercase tracking-[0.05em]">Official: </span>
         <CefrBadge level={student.officialCefrLevel} />
       </span>
     )}
   </div>
   ```

3. Remove the two language spans from the metadata row (~lines 391-400):
   - The `{student.learningLanguage}` span
   - The `Native: {nativeLanguages.join(', ')}` span
   
4. Remove the `CefrBadge` + officialCefr from the metadata row (moved to name line).

5. The metadata row then only has location left. Simplify or remove the wrapping div if empty.

**Result:** 3 lines: name+CEFR, subtitle, status badges+next-session.

---

### F2 — Separate ACTIVE and PRIVATE/CORPORATE badges (StudentDetail.tsx:339-354)

**Current:** Single combined badge `"ACTIVE · PRIVATE"` in bg-[#E8E7F1] text-[#464455].

**Change:** Replace with two separate pills:
```jsx
{student.isActive ? (
  <>
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] bg-green-100 text-green-700" data-testid="student-status-badge">
      Active
    </span>
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] bg-indigo-100 text-indigo-700" data-testid="student-type-badge">
      {student.isCorporate ? 'Corporate' : 'Private'}
    </span>
  </>
) : (
  <span className="..." data-testid="student-status-badge">Inactive</span>
)}
```

---

### F3 — Session card title from topicTags (sessionUtils.ts + ScenarioSeeder.cs)

**Root cause:** `getSessionTitle` only uses `session.title`. TopicTags are available as raw JSON string on the session, but `getSessionTitle` doesn't parse them.

**Additional issue:** ScenarioSeeder stores topicTags as `{"Tag":"...","Category":...}` (PascalCase) but `parseTopicTags` checks for lowercase `"tag"`. Fix seed to use camelCase.

**Changes:**

1. `sessionUtils.ts` — update `getSessionTitle`:
   ```ts
   import { type SessionLog, parseTopicTags } from '../api/sessionLogs'
   
   export function getSessionTitle(session: SessionLog): string {
     if (session.title) return session.title
     const tags = parseTopicTags(session.topicTags)
     if (tags.length > 0) return tags[0].tag
     if (session.sessionDate) return `Session, ${formatMonthDay(session.sessionDate)}`
     return 'Session'
   }
   ```

2. `sessionUtils.test.ts` — add tests:
   - `getSessionTitle` returns first tag when no title
   - `getSessionTitle` falls back to date when no title and no tags
   - `getSessionTitle` uses title even when tags present

3. `ScenarioSeeder.cs` — fix both PascalCase occurrences:
   - Line 197 (scenario 1, Ana A1 past session): `{"Tag":"Pretérito indefinido",...}` -> `{"tag":"Pretérito indefinido"}`
   - Line 519 (scenario 6, Hans B1 past session): `{"Tag":"Ser vs estar",...}` -> `{"tag":"Ser vs estar"}`
   ```csharp
   // After (camelCase, matches parseTopicTags):
   TopicTags = """[{"tag":"Pretérito indefinido"},{"tag":"Verbos reflexivos"}]""",
   // ...
   TopicTags = """[{"tag":"Ser vs estar"},{"tag":"Subjuntivo"}]""",
   ```

4. `sessionUtils.ts` — note: `parseTopicTags` must be added to the import from `'../api/sessionLogs'`. The existing import imports only `type SessionLog`; extend it to also import `parseTopicTags`.

---

### F4 — "Edit full session" link in expanded row (SessionHistoryTab.tsx:494)

**Change:** Add a link in the expanded detail footer area alongside the delete button:
```jsx
{/* Edit full session link */}
<Link
  to={`/students/${studentId}/log-session?sessionId=${session.id}`}
  className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
  data-testid="edit-full-session-link"
>
  <Pencil className="h-3.5 w-3.5" />
  Edit full session
</Link>
```

Place it in the same `<div>` as the delete button (line 494), before the delete button.

**Unit test** (`SessionHistoryTab.test.tsx`): render an expanded session entry, verify `edit-full-session-link` has correct href.

**E2e test** (`student-detail.spec.ts`): expand a session row, click "Edit full session", verify navigation to `/students/:id/log-session?sessionId=...`.

---

### F5 — Remove content-separation borders (5 components)

Replace `border border-zinc-100` etc. with tonal backgrounds or spacing only:

| File | Line(s) | Old | New |
|------|---------|-----|-----|
| `LessonHistoryCard.tsx` | 44, 62 | `border border-zinc-100 rounded-lg p-3` | `rounded-lg p-3 bg-[#F4F2FD]/40` |
| `ProgressDashboard.tsx` | 260 | `border-y border-zinc-200/60` | remove these two classes (keep spacing) |
| `ProgressDashboard.tsx` | 356 | `border-b border-zinc-50 last:border-0` | remove these two classes |
| `StudentCoursesCard.tsx` | 38 | `border border-zinc-100 rounded-lg p-3` | `rounded-lg p-3 bg-[#F4F2FD]/40` |
| `StudentCoursesCard.tsx` | 63 | `border border-zinc-100` | `bg-[#F4F2FD]/40` |
| `StudentProfileOverview.tsx` | 49 | `border-zinc-200` on `<Card>` | remove `border-zinc-200`, rely on Card's default shadow |

Form input borders (border-amber-200, border-indigo-200, etc.) are NOT touched.

---

## Test Plan

- Unit: `getSessionTitle` with topicTags (new tests in sessionUtils.test.ts)
- Unit: `SessionHistoryTab` edit link renders with correct href
- E2e: expand session row -> click "Edit full session" -> lands on log-session with sessionId param
- Manual check list (in review-ui):
  - Header: name+CEFR on same line, subtitle has "learning English", no duplicate language labels
  - ACTIVE badge green-tinted, PRIVATE/CORPORATE badge indigo-tinted
  - Hans B1 sessions tab: "Ser vs estar" shows as session title (not "Session, Apr ...")
  - No content-separation borders in 5 components

---

## Out of Scope

- Avatar / student photo (roadmap)
- PRIMARY OBJECTIVE as separate card (roadmap)
- Sessions topic filter (roadmap)
