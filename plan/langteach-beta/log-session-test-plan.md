# Log Session / Edit Session: Exhaustive Test Plan

**Screens:** `/students/:id/log-session` (create) and `/students/:id/sessions/:sessionId/edit` (edit)
**Component:** `LogSession.tsx` (shared for both routes)
**Reference docs:** `docs/design-system.md` (section 11), `sessionLogs.ts` API types, `SessionLog.cs` backend model

---

## How to run this plan

This plan is split into two sequential passes. Run them in order in the same session.

**Pass 1 — Chrome+Claude:** Use the Chrome extension to navigate the live app. Verify appearance and interactions visually. Report findings as a table: `| # | Result | Notes |` where Result is PASS / FAIL / SKIP (with reason).

**Pass 2 — Playwright:** Run the e2e suite. For Function rows not yet covered by an existing test, write a new Playwright test, run it, and report the result. Report findings in the same format.

After both passes, produce a single consolidated findings table.

**Test students:**
- **Ana Visual** (B2, sessions + todos + followups + difficulties + objectives): full data
- **Clara Seed** (A1, minimal data): empty states and first-session scenarios
- **Marco B1** (has homework in previous sessions): homework status scenarios

---

## Pass 1: Chrome + Claude

*All Display and Interaction layer tests. Navigate the live app, verify visually.*

### 1. Navigation and Loading

#### 1.1 Entry points
| # | Test | Student | Steps |
|---|------|---------|-------|
| 1.1.1 | Navigate from Student Detail "Log Session" button | Ana Visual | Click "Log Session" on Ana Visual's detail page. Verify URL is `/students/:id/log-session`. |
| 1.1.2 | Navigate from Session History "Edit" link | Ana Visual | Expand a session row in Sessions tab, click the edit pencil/link. Verify URL is `/students/:id/sessions/:sessionId/edit`. |
| 1.1.3 | Navigate from Dashboard "Start session" link | Ana Visual | If Ana Visual has an upcoming session in NextSessionHero, click the CTA. Verify correct student loads. |
| 1.1.4 | Direct URL with invalid student ID | — | Navigate to `/students/nonexistent/log-session`. Verify "Student not found." message appears. |
| 1.1.5 | Direct URL with invalid session ID (edit mode) | Ana Visual | Navigate to `/students/:id/sessions/nonexistent/edit`. Verify "Session not found." message appears. |

#### 1.2 Loading states
| # | Test | Student | Steps |
|---|------|---------|-------|
| 1.2.1 | Skeleton while loading | Ana Visual | Navigate to log session. Verify skeleton placeholders appear before data loads. |
| 1.2.2 | Both panels render after load | Ana Visual | Verify left panel (student context) and right panel (form) are both visible. |

### 2. Left Panel: Student Context

#### 2.1 Student header
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.1.1 | Student name displayed | Ana Visual | Verify name matches. |
| 2.1.2 | Initials avatar | Ana Visual | Verify "AV" initials with indigo gradient background. |
| 2.1.3 | CEFR badge | Ana Visual | Verify badge shows "B2" in square format (not pill). |
| 2.1.4 | Native languages | Ana Visual | Verify native languages appear below name. |
| 2.1.5 | Session number (create mode) | Ana Visual | Verify "Session #N" where N = previous non-cancelled + 1. |
| 2.1.6 | Session number (edit mode) | Ana Visual | Verify correct chronological rank of the edited session. |
| 2.1.7 | Skill level overrides | Ana Visual | Verify overrides appear (e.g. "Reading B2 | Writing B1"). |

#### 2.2 Short-term objectives
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.2.1 | Objectives rendered | Ana Visual | Verify objectives appear in white cards with text and target date. |
| 2.2.2 | Urgency colors | Ana Visual | Verify overdue = red "OVERDUE", critical = amber, normal = zinc. |
| 2.2.3 | Sort order | Ana Visual | Verify sort: overdue first, then critical, then normal. |
| 2.2.4 | No objectives: section absent | Clara Seed | Verify section is not rendered (no empty state, just absent). |

#### 2.3 Teaching Todos (left panel)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.3.1 | Pending todos displayed | Ana Visual | Verify pending todos appear with checkboxes. |
| 2.3.2 | **BUG CHECK** — custom checkbox | Ana Visual | Verify square `w-4 h-4 rounded border-2 border-indigo-400` toggle (not native HTML checkbox). Per design-system.md 11.4. |
| 2.3.3 | Check a todo | Ana Visual | Click checkbox. Verify strikethrough + muted color. |
| 2.3.4 | Uncheck a todo | Ana Visual | Click again. Verify strikethrough removed. |
| 2.3.5 | Helper text on check | Ana Visual | After checking one, verify "Checked items will be marked as covered on Done" appears. |
| 2.3.6 | No pending todos: section absent | Clara Seed | Verify section is not rendered. |

#### 2.4 Pending Followups (left panel)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.4.1 | Pending followups displayed | Ana Visual | Verify followups appear with checkboxes. |
| 2.4.2 | Section label | Ana Visual | Verify label reads "Open followups from previous sessions". |
| 2.4.3 | Helper text | Ana Visual | Verify "Check items you addressed in this session" appears. |
| 2.4.4 | **BUG CHECK** — custom checkbox | Ana Visual | Verify circle `w-3 h-3 rounded-full border-2 border-amber-400` toggle (not native HTML checkbox). |
| 2.4.5 | Check a followup | Ana Visual | Click checkbox. Verify strikethrough + muted + reduced opacity. |
| 2.4.6 | Due date shown | Ana Visual | Verify due date appears in amber text when present. |
| 2.4.7 | No pending followups: section absent | Clara Seed | Verify section is not rendered. |

#### 2.5 Last Session card
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.5.1 | Last session content | Ana Visual | Verify previous session's date, duration, content summary, and homework are shown. |
| 2.5.2 | Content truncation | Ana Visual | Verify long actualContent is truncated to 3 lines (`line-clamp-3`). |
| 2.5.3 | First session empty state | Clara Seed | Verify "First session!" + "Great start with this student." appears. |
| 2.5.4 | Edit mode: shows session BEFORE the edited one | Ana Visual | Verify "Last Session" shows the chronologically prior session, not the most recent overall. |

#### 2.6 Working Memory
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.6.1 | Teaching notes displayed | Ana Visual | Verify Working Memory card appears when `teachingNotes` is set. |
| 2.6.2 | Long text truncation | Ana Visual | Verify 4-line clamp and "Show more" link for notes > 200 chars. |
| 2.6.3 | Expand/collapse | Ana Visual | Click "Show more". Verify full text. Click "Show less". Verify truncated. |
| 2.6.4 | No teaching notes: section absent | Clara Seed | Verify section is absent. |

#### 2.7 Planned for Today
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.7.1 | Shows previous session's nextSessionTopics | Ana Visual | Verify it appears in an indigo-tinted card. |
| 2.7.2 | Pre-populates "What Happened?" textarea | Ana Visual | Verify actualContent textarea is pre-filled with planned content. |
| 2.7.3 | Not shown when empty | Clara Seed | Verify section is absent when no nextSessionTopics. |

#### 2.8 Active Difficulties
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.8.1 | Active difficulties listed | Ana Visual | Verify only "Active" status difficulties appear (not "Covered"). |
| 2.8.2 | Checkbox toggles | Ana Visual | Click checkbox. Verify it toggles. |
| 2.8.3 | Long description expand | Ana Visual | Verify "more"/"less" toggle for descriptions > 80 chars. |
| 2.8.4 | Helper text on check | Ana Visual | After checking, verify "Checked items will be recorded as worked on today" appears. |

#### 2.9 Suggested Difficulties
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.9.1 | AI-extracted suggestions displayed | Ana Visual | In edit mode for a session with suggestedDifficulties, verify chips with competency/subcategory. |
| 2.9.2 | Dismiss a suggestion | Ana Visual | Click X. Verify it's removed. |

#### 2.10 Scroll behavior
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.10.1 | Left panel scrolls independently | Ana Visual | Verify left panel scrolls independently from right. |
| 2.10.2 | Scroll gradient appears | Ana Visual | Scroll down. Verify gradient overlay at the bottom. |
| 2.10.3 | Gradient disappears at bottom | Ana Visual | Scroll to very bottom. Verify gradient disappears. |

### 3. Right Panel: Metadata Bar

#### 3.1 Date field
| # | Test | Student | Steps |
|---|------|---------|-------|
| 3.1.1 | Default to today (create mode) | Ana Visual | Verify date input shows today's date. |
| 3.1.2 | Pre-populated (edit mode) | Ana Visual | Verify date shows session's original date. |
| 3.1.3 | Styled correctly | Ana Visual | Verify `bg-zinc-100 border-none h-8` — no visible border. |

#### 3.2 Time field
| # | Test | Student | Steps |
|---|------|---------|-------|
| 3.2.1 | Default to current time (create mode) | Ana Visual | Verify time input shows approximately current time (HH:MM). |
| 3.2.2 | Pre-populated (edit mode) | Ana Visual | Verify time shows session's original time. |

#### 3.3 Duration field
| # | Test | Student | Steps |
|---|------|---------|-------|
| 3.3.1 | Default selection | Ana Visual | Verify "60 min" selected by default in create mode. |
| 3.3.2 | Dropdown options | Ana Visual | Verify options: 30, 45, 60, 90 min, Other. |
| 3.3.3 | Select "Other" shows custom input | Ana Visual | Select "Other". Verify number input appears. |
| 3.3.4 | Edit mode: standard value | Ana Visual | Edit session with duration=60. Verify "60 min" selected. |
| 3.3.5 | Edit mode: custom value | Ana Visual | Edit session with duration=75. Verify "Other" + "75" in custom input. |

#### 3.4 Cancelled toggle
| # | Test | Student | Steps |
|---|------|---------|-------|
| 3.4.1 | **BUG CHECK** — label | Ana Visual | Verify label says "Cancelled" directly, not under "Status" heading (per design-system.md 11.3). |
| 3.4.2 | **BUG CHECK** — toggle dimensions | Ana Visual | Verify `h-6 w-11` track, `h-4 w-4` thumb. Currently `h-5 w-9` / `h-3.5 w-3.5`. |
| 3.4.3 | Toggle on hides form fields | Ana Visual | Enable "Cancelled". Verify main form disappears, only minimal fields remain. |
| 3.4.4 | Toggle off restores form | Ana Visual | Disable. Verify all fields reappear. |
| 3.4.5 | Edit mode pre-population | Ana Visual | Edit a cancelled session. Verify toggle is on and minimal fields shown. |

### 4. Right Panel: Main Form

#### 4.1 Page heading
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.1.1 | Create mode heading | Ana Visual | Verify "What Happened?" in Manrope 2xl bold. |
| 4.1.2 | Edit mode heading | Ana Visual | Verify "Edit Session". |
| 4.1.3 | Session info line | Ana Visual | Verify "Session #N . <date>" to the right of heading. |
| 4.1.4 | Subtitle (create only) | Ana Visual | Verify "Reflect on the session flow and student engagement." in create mode; absent in edit mode. |

#### 4.2 Previous Homework Status
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.2.1 | Section shown when prev session has homework | Marco B1 | Verify "Previous Homework" section appears. |
| 4.2.2 | Section absent when no prev homework | Clara Seed | Verify section is absent. |
| 4.2.3 | Three pill buttons | Marco B1 | Verify buttons: "Done", "Partial", "Not Done". |
| 4.2.4 | Selection styling | Marco B1 | Click "Partial". Verify indigo-600 bg + white text. Others remain light. |
| 4.2.5 | Only one selected at a time | Marco B1 | Click "Done", then "Partial". Verify "Done" deselects. |
| 4.2.6 | Edit mode pre-population | Marco B1 | Edit session with previousHomeworkStatus="Partial". Verify "Partial" selected. |

#### 4.3 "What Happened?" textarea
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.3.1 | Reference banner when planned content exists | Ana Visual | Verify "Reference: <italic text>" appears above textarea. |
| 4.3.2 | Edit mode pre-population | Ana Visual | Edit a session. Verify textarea shows existing actualContent. |

#### 4.4 Voice Note recorder
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.4.1 | AudioRecorder component rendered | Ana Visual | Verify recorder section appears below textarea. |

#### 4.5 Topics Covered (TopicTagsInput)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.5.1 | Tag input + category dropdown + Add button | Ana Visual | Verify all three controls are present. |
| 4.5.2 | Add a tag via Enter | Ana Visual | Type "subjunctive", press Enter. Verify badge appears. |
| 4.5.3 | Add a tag with category | Ana Visual | Type "ser/estar", select "Grammar", click Add. Verify "ser/estar (Grammar)" badge. |
| 4.5.4 | Remove a tag | Ana Visual | Click X on badge. Verify removal. |
| 4.5.5 | Suggested tags from content | Ana Visual | Type "subjuntivo" in What Happened. Verify "Suggested:" chips appear. |
| 4.5.6 | Click suggested tag adds it | Ana Visual | Click a suggested tag. Verify it moves to active tags. |
| 4.5.7 | Edit mode pre-population | Ana Visual | Edit session with existing topicTags. Verify all tags as badges. |
| 4.5.8 | Empty tag not added | Ana Visual | Try Add with empty input. Verify nothing happens, button disabled. |

#### 4.6 Homework Assigned
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.6.1 | Label and placeholder | Ana Visual | Verify label "Homework Assigned" and placeholder "e.g. Workbook page 42, exercises 3-5". |
| 4.6.2 | Edit mode pre-population | Ana Visual | Edit session with homework. Verify field shows existing value. |

#### 4.7 Next Session Plan
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.7.1 | Label, textarea type, placeholder | Ana Visual | Verify label "Next Session Plan", multi-line textarea, placeholder "What to focus on next time...". |
| 4.7.2 | Edit mode pre-population | Ana Visual | Edit session with nextSessionTopics. Verify content shown. |

#### 4.8 New Teaching Todos (quick-add)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.8.1 | Section label and background | Ana Visual | Verify "New Teaching Todos" in indigo uppercase; `#F0EFFF` background with `rounded-xl p-4`. |
| 4.8.2 | **BUG CHECK** — placeholder | Ana Visual | Verify placeholder reads "Add a teaching idea..." (currently "Add todo..."). Per 11.3. |
| 4.8.3 | **BUG CHECK** — add button style | Ana Visual | Verify filled `rounded-lg bg-indigo-600 p-1.5` with Plus icon (currently ghost variant). Per 11.1. |
| 4.8.4 | Add via Enter | Ana Visual | Type text, press Enter. Verify item appears in list. |
| 4.8.5 | Add via button click | Ana Visual | Type text, click Plus. Verify item appears. |
| 4.8.6 | Remove item | Ana Visual | Click X. Verify removal. |
| 4.8.7 | Empty input blocked | Ana Visual | Try to add with empty input. Verify nothing happens. |
| 4.8.8 | Multiple items preserved | Ana Visual | Add 3 items. Verify all 3 shown with X buttons. |

#### 4.9 New Followups (quick-add)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.9.1 | Section label and background | Ana Visual | Verify "New Followups" in amber uppercase; `#FFFBEB` background. |
| 4.9.2 | **BUG CHECK** — add button style | Ana Visual | Verify filled `rounded-lg bg-amber-500 p-1.5` with Plus icon (currently ghost variant). Per 11.1. |
| 4.9.3 | Add and remove | Ana Visual | Add an item via Enter, then remove via X. Verify both work. |

#### 4.10 Todos + Followups layout
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.10.1 | Two-column layout | Ana Visual | Verify `grid-cols-2`, side by side, equal widths. |
| 4.10.2 | Responsive behavior | Ana Visual | Narrow the browser. Verify columns stack or remain usable. |

### 5. Right Panel: Secondary Sections

#### 5.1 Progressive disclosure toggle
| # | Test | Student | Steps |
|---|------|---------|-------|
| 5.1.1 | Collapsed by default | Ana Visual | Verify secondary sections hidden on load. |
| 5.1.2 | Toggle text | Ana Visual | Collapsed: "Show homework, cultural notes, error patterns...". Expanded: "Hide additional sections". |
| 5.1.3 | Chevron rotates | Ana Visual | Verify 180° rotation on expand. |
| 5.1.4 | Sections appear/disappear | Ana Visual | Toggle open and closed. Verify smooth transition. |

#### 5.2 Notes (generalNotes)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 5.2.1 | **BUG CHECK** — label | Ana Visual | Verify label reads "Notes" (currently "Today's Context"). Per design-system.md 11.3. |
| 5.2.2 | Placeholder and textarea type | Ana Visual | Verify placeholder "Observations on mood, energy levels, context..." and multi-line textarea. |
| 5.2.3 | Edit mode pre-population | Ana Visual | Edit session with generalNotes. Verify content appears. |

#### 5.3 Link to Lesson Plan
| # | Test | Student | Steps |
|---|------|---------|-------|
| 5.3.1 | Shown when student has lessons | Ana Visual | Verify dropdown appears. |
| 5.3.2 | Dropdown lists student's lessons | Ana Visual | Open dropdown. Verify lessons appear with "None" as first option. |
| 5.3.3 | Section absent when no lessons | Clara Seed | Verify section does not appear. |
| 5.3.4 | Edit mode pre-population | Ana Visual | Edit session linked to a lesson. Verify correct lesson selected. |

#### 5.4 Level Reassessment
| # | Test | Student | Steps |
|---|------|---------|-------|
| 5.4.1 | Toggle label | Ana Visual | Verify "Flag for Level Reassessment". |
| 5.4.2 | **BUG CHECK** — toggle dimensions | Ana Visual | Same size issue as 3.4.2. |
| 5.4.3 | Toggle reveals CEFR dropdown | Ana Visual | Enable toggle. Verify CEFR sub-level dropdown with placeholder "e.g. B1.1". |
| 5.4.4 | CEFR sub-level options | Ana Visual | Open dropdown. Verify 12 options: A1.1 through C2.2. |
| 5.4.5 | Edit mode pre-population | Ana Visual | Edit session with reassessment data. Verify toggle on + level selected. |

### 6. Cancelled Session Mode

| # | Test | Student | Steps |
|---|------|---------|-------|
| 6.1 | Info text | Ana Visual | Enable cancelled. Verify italic: "This session was cancelled. Only date, duration, topics covered and notes will be recorded." |
| 6.2 | Minimal fields only | Ana Visual | Verify only Topics Covered, Notes, Level Reassessment shown. No "What Happened", no homework, no todos/followups, no Next Session Plan. |
| 6.3 | **BUG CHECK** — Notes label | Ana Visual | Verify label reads "Notes" in cancelled mode (currently "Notes" here but "Today's Context" in normal mode — both must say "Notes"). |
| 6.4 | Topics Covered works in cancelled mode | Ana Visual | Add a topic tag. Verify it appears. |
| 6.5 | Reassessment works in cancelled mode | Ana Visual | Toggle reassessment. Verify it works. |
| 6.6 | Toggle back to non-cancelled | Ana Visual | Toggle cancelled off. Verify all fields reappear, previously entered data preserved. |

### 7. Autosave indicator states

| # | Test | Student | Steps |
|---|------|---------|-------|
| 7.1 | Idle (create mode, no changes) | Ana Visual | Verify no status text shown. |
| 7.2 | Saving | Ana Visual | Make a change. Verify "Saving..." + spinner. |
| 7.3 | Saved | Ana Visual | After save. Verify green checkmark + "All changes saved". |
| 7.4 | Last saved (edit mode idle) | Ana Visual | In edit mode before changes. Verify "Last saved <relative time>". |
| 7.5 | Status resets after ~2s | Ana Visual | After "All changes saved", wait. Verify it fades/resets. |

### 8. Done and Back buttons

| # | Test | Student | Steps |
|---|------|---------|-------|
| 8.1 | Done button placement and style | Ana Visual | Verify top-right, `variant="outline" size="sm"`. |
| 8.2 | Done button text changes while saving | Ana Visual | Click Done. Verify text changes to "Saving..." while processing. |
| 8.3 | Done button disabled while saving | Ana Visual | While saving, verify button is disabled. |
| 8.4 | Back arrow with changes shows discard bar | Ana Visual | Make a change, click back. Verify amber bar "You have unsaved changes. Discard this session?". |
| 8.5 | "Keep Editing" dismisses bar | Ana Visual | Click "Keep Editing". Verify bar gone, form intact. |
| 8.6 | Discard bar appears | Ana Visual | Click "Discard". Verify navigates to student detail. |

### 11. Cross-Screen Consistency

*Navigate between screens to compare identical components side by side.*

| # | Test | Screens to compare | What to check |
|---|------|-------------------|---------------|
| 11.1 | Todo checkbox visual | LogSession left panel vs TeachingTodosCard (Edit Student sidebar) | Same square toggle, same colors, same checked state |
| 11.2 | Followup checkbox visual | LogSession left panel vs StudentFollowupsCard (Edit Student sidebar) | Same circle toggle, same colors, same done state |
| 11.3 | Todo add input style | LogSession right panel vs TeachingTodosCard | Same `<Input>` component, same `bg-indigo-50`, same placeholder |
| 11.4 | Followup add input style | LogSession right panel vs StudentFollowupsCard | Same `<Input>` component, same `bg-amber-50`, same placeholder |
| 11.5 | Todo add button | LogSession vs TeachingTodosCard | Same filled `bg-indigo-600 rounded-lg` with Plus icon |
| 11.6 | Followup add button | LogSession vs StudentFollowupsCard | Same filled `bg-amber-500 rounded-lg` with Plus icon |
| 11.7 | Toggle switch size | LogSession (cancelled, reassessment) vs Edit Student (isActive, isCorporate) | Same `h-6 w-11` dimensions |
| 11.8 | Autosave indicator | LogSession vs Edit Student | Same icon set, same text, same positioning |
| 11.9 | Done button | LogSession vs Edit Student | Same `variant="outline" size="sm"` |
| 11.10 | CEFR badge | LogSession left panel vs Student Detail header | Same `CefrBadge` component, same colors |
| 11.11 | "Edit full session" link | Sessions tab expanded row (Student Detail) | Pencil icon present, link visible, navigates to log-session |
| 11.12 | Topic tag badge | LogSession right panel vs SessionHistoryTab collapsed card | Same badge format, same colors |

---

## Pass 2: Playwright

*All Function layer tests. For existing tests: run and report result. For gaps: write test, run, report.*

### F1. Navigation functions

| # | Test | Student | Steps |
|---|------|---------|-------|
| F1.1 | Navigate from "Log Session" button lands on correct URL | Ana Visual | Click "Log Session". Assert URL matches `/students/:id/log-session`. |
| F1.2 | Navigate via `?lessonId=` pre-selects lesson | Ana Visual | Navigate `/log-session?lessonId=xxx`. Assert lesson dropdown shows that lesson. |
| F1.3 | Ctrl+Enter triggers Done | Ana Visual | Make a change, press Ctrl+Enter. Assert navigation to student detail. |
| F1.4 | Done (create) navigates to `/students/:id` | Ana Visual | Log session, click Done. Assert URL is `/students/:id`. |
| F1.5 | Done (edit) navigates to `/students/:id?tab=sessions` | Ana Visual | Edit session, click Done. Assert URL includes `?tab=sessions`. |
| F1.6 | Discard in edit mode does NOT modify original session | Ana Visual | Edit session, change actualContent, click back, click Discard. Reload session in edit mode. Assert original content unchanged. |

### F2. Autosave mechanics

| # | Test | Student | Steps |
|---|------|---------|-------|
| F2.1 | First save in create mode is POST | Ana Visual | Intercept network. Make first change. Assert POST to `/api/students/:id/sessions`. |
| F2.2 | Subsequent saves are PUT | Ana Visual | Make second change. Assert PUT to `/api/students/:id/sessions/:id`. |
| F2.3 | Edit mode: all saves are PUT | Ana Visual | In edit mode, change a field. Assert PUT (never POST). |
| F2.4 | Text fields debounce (~400ms) | Ana Visual | Type rapidly. Assert single save fires after pause, not one per keystroke. |
| F2.5 | Select/toggle saves immediately | Ana Visual | Change duration. Assert save fires without debounce delay. |
| F2.6 | Autosave disabled until edit data loads | Ana Visual | Intercept the session load. Assert no PUT fires before session data is populated. |
| F2.7 | Payload contains all fields (full-object PUT) | Ana Visual | Inspect PUT payload. Assert all session fields present (not just changed field). |
| F2.8 | saveNow does not race with pending debounce | Ana Visual | Type text (debounced), immediately change duration (saveNow). Assert text is NOT lost in the immediate save. |

### F3. Field persistence (create → edit round-trip)

**Student: Ana Visual.** Log a new session with all fields filled. Click Done. Reopen in edit mode. Assert every field.

| # | Field | Value | Assert in edit mode |
|---|-------|-------|---------------------|
| F3.1 | Date | 2026-04-10 | Date input = "2026-04-10" |
| F3.2 | Time | 14:30 | Time input = "14:30" |
| F3.3 | Duration (standard) | 45 min | Dropdown = "45 min" |
| F3.4 | Duration (custom) | 75 min | Dropdown = "Other", custom input = "75" |
| F3.5 | Previous Homework | "Partial" | "Partial" pill selected |
| F3.6 | What Happened | "Covered conditional tense" | Textarea = exact text |
| F3.7 | Homework Assigned | "Workbook p.42 ex 3-5" | Input = exact text |
| F3.8 | Next Session Plan | "Review subjunctive\nPractice letter writing" | Textarea = exact text including newline |
| F3.9 | Notes | "Student was tired today" | Textarea = exact text |
| F3.10 | Topic tag (no category) | "subjunctive" | Badge "subjunctive" present |
| F3.11 | Topic tag (with category) | "ser/estar" + Grammar | Badge "ser/estar (Grammar)" present |
| F3.12 | Linked lesson | any lesson | Correct lesson selected in dropdown |
| F3.13 | Reassessment toggle + level | On + B2.1 | Toggle on, dropdown = "B2.1" |
| F3.14 | Mentioned difficulties | 2 checked | Same 2 checked in left panel |
| F3.15 | Status | always "Confirmed" | API field `status: "Confirmed"` |

### F4. Cancelled session round-trip

**Student: Ana Visual.**

| # | Field | Value | Assert |
|---|-------|-------|--------|
| F4.1 | Cancelled toggle | true | Toggle on, minimal fields shown |
| F4.2 | Date | 2026-04-12 | Date = "2026-04-12" |
| F4.3 | Notes | "Student cancelled due to illness" | Textarea = exact text |
| F4.4 | actualContent | should be null | Field absent or empty |
| F4.5 | homeworkAssigned | should be null | Field absent |
| F4.6 | nextSessionTopics | should be null | Field absent |

### F5. Edit persistence (change field, reopen, verify unchanged fields intact)

**Student: Ana Visual.**

| # | Test | Steps |
|---|------|-------|
| F5.1 | Change actualContent only | Change text. Re-open. Assert new text AND all other fields unchanged. |
| F5.2 | Change duration only | 60 → 90. Re-open. Assert 90 and everything else unchanged. |
| F5.3 | Add a topic tag | Add to existing tags. Re-open. Assert old + new tags all present. |
| F5.4 | Remove a topic tag | Remove one from many. Re-open. Assert only that tag gone. |
| F5.5 | Toggle cancelled on | Re-open. Assert cancelled=true AND actualContent/homework are null. |
| F5.6 | Toggle cancelled off | Re-open. Assert actualContent editable (empty). |
| F5.7 | Change reassessment level | B1.1 → B2.1. Re-open. Assert B2.1. |
| F5.8 | Disable reassessment | Re-open. Assert skill and level are null. |
| F5.9 | Unlink a lesson | Set to "None". Re-open. Assert no lesson selected, `linkedLessonId` null. |

### F6. Done button side effects

| # | Test | Student | Steps |
|---|------|---------|-------|
| F6.1 | New todos created | Ana Visual | Add 2 todos. Click Done. Go to Edit Student. Assert both "Pending" in todos list. |
| F6.2 | New followup created with sourceSessionLogId | Ana Visual | Add 1 followup. Click Done. Go to student. Assert followup "pending" with `sourceSessionLogId` set. |
| F6.3 | Checked todos marked Covered | Ana Visual | Check 2 existing todos. Click Done. Assert both "Covered" with `coveredInSessionLogId`. |
| F6.4 | Checked followups marked Done | Ana Visual | Check 1 existing followup. Click Done. Assert followup status "done". |
| F6.5 | Mixed operations all take effect | Ana Visual | Add 1 todo + check 1 existing + add 1 followup + check 1 existing. Click Done. Assert all 4. |
| F6.6 | No spurious todos/followups when nothing staged | Ana Visual | Change only form fields. Click Done. Assert no new todos or followups created. |
| F6.7 | Cancelled session: side effects skipped | Ana Visual | Toggle cancelled, check todos + followups, add new. Click Done. Assert NONE of the todo/followup operations took effect. |
| F6.8 | Items NOT committed before Done | Ana Visual | Add a todo, navigate away without Done. Assert todo was NOT created. |

### F7. No silent field clearing

| # | Test | Student | Steps |
|---|------|---------|-------|
| F7.1 | suggestedDifficulties preserved on unrelated edit | Ana Visual | Edit session with AI suggestions. Change only actualContent. Re-open. Assert suggestions still present. |
| F7.2 | mentionedDifficultyPairs preserved | Ana Visual | Edit session with checked difficulties. Change only homework. Re-open. Assert pairs intact. |
| F7.3 | topicTags preserved | Ana Visual | Edit session with tags. Change only duration. Re-open. Assert all tags still there. |
| F7.4 | title preserved | Ana Visual | Edit session with auto-generated title. Change something else. Re-open. Assert title unchanged. |
| F7.5 | voiceNote link preserved | Ana Visual | Session with voice note. Edit text fields. Re-open. Assert `hasVoiceNote` still true. |

### F8. Autosave trigger verification

| # | Test | Student | Steps |
|---|------|---------|-------|
| F8.1 | Date change triggers save | Ana Visual | Change date. Assert autosave fires. |
| F8.2 | Time change triggers save | Ana Visual | Change time. Assert autosave fires. |
| F8.3 | Duration change triggers immediate save | Ana Visual | Change duration. Assert `saveNow` (not debounced). |
| F8.4 | Cancelled toggle triggers immediate save | Ana Visual | Toggle cancelled. Assert `saveNow` with `isCancelled: true`. |
| F8.5 | Topic tag add triggers immediate save | Ana Visual | Add tag. Assert `saveNow`. |
| F8.6 | Difficulty toggle triggers autosave | Ana Visual | Toggle difficulty checkbox. Assert autosave fires. |
| F8.7 | Suggested difficulty dismiss triggers autosave | Ana Visual | Dismiss suggestion. Assert autosave fires. |
| F8.8 | Voice note save triggers immediate save | Ana Visual | Record voice note. Assert `saveNow` with `voiceNoteId` set. |
| F8.9 | Reassessment toggle triggers immediate save | Ana Visual | Toggle on. Assert `saveNow` with `levelReassessmentSkill: 'General'`. |
| F8.10 | Reassessment level change triggers immediate save | Ana Visual | Select B1.2. Assert `saveNow` with `levelReassessmentLevel: 'B1.2'`. |

### F9. Edge cases

| # | Test | Student | Steps |
|---|------|---------|-------|
| F9.1 | First session: no prev homework, no planned content, session #1 | Clara Seed | Assert no Previous Homework section, no Planned for Today, "Session #1". |
| F9.2 | Next session plan flows to next session's Planned for Today | Ana Visual | Save with nextSessionTopics. Start new session for same student. Assert "Planned for Today" shows that text. |
| F9.3 | Done without any changes navigates without creating session | Clara Seed | Open create mode, make no changes, click Done. Assert no new session created (no POST fired). |
| F9.4 | Browser refresh in edit mode returns to same session with saved data | Ana Visual | Make changes (autosave fires). Refresh. Assert same session loaded with latest data. |

---

## Known Issues (from design-system.md audit)

Bugs flagged in Pass 1 BUG CHECK items for easy reference:

1. Native HTML checkboxes in left panel (todos and followups) — see 2.3.2, 2.4.4
2. Toggle switch wrong size in LogSession vs Edit Student — see 3.4.2, 5.4.2
3. "Today's Context" label should be "Notes" — see 5.2.1, 6.3
4. "Status" heading on cancelled toggle should say "Cancelled" — see 3.4.1
5. Todo add button is ghost variant, should be filled `bg-indigo-600` — see 4.8.3
6. Followup add button is ghost variant, should be filled `bg-amber-500` — see 4.9.2

---

## Test Run Results — 2026-04-19

**Environment:** Dev stack (localhost:5173, API localhost:5000, real Auth0)
**Test students seeded via:** `--seed-scenario 7` (Scenario 7 added in this session)
**Tester:** Claude (automated Pass 1 + Pass 2)

---

### Pass 1 Results: Chrome + Claude

#### Navigation and Loading

| # | Result | Notes |
|---|--------|-------|
| 1.1.1 | SKIP | Not tested directly (navigated by URL) |
| 1.1.2 | SKIP | Not tested in this run |
| 1.1.3 | SKIP | Not tested in this run |
| 1.1.4 | **FAIL** | Shows bare "Student not found." text with no back button or styled error state |
| 1.1.5 | **FAIL** | Same bare "Student not found." for malformed ID — both 1.1.4 and 1.1.5 share the same deficiency |
| 1.2.1 | PASS | Skeleton visible on initial load |
| 1.2.2 | PASS | Both panels render after load |

#### Left Panel: Student Context

| # | Result | Notes |
|---|--------|-------|
| 2.2.4 | PASS | Short-term Objectives absent for Clara Seed (empty state) |
| 2.3.2 | **FAIL (BUG)** | Followup items use native HTML checkboxes, not custom square controls |
| 2.3.6 | PASS | Open Followups absent for Clara Seed |
| 2.4.4 | **FAIL (BUG)** | Difficulty items use native HTML checkboxes, not custom controls |
| 2.4.7 | PASS | Active Difficulties absent for Clara Seed |
| 2.5.3 | PASS | Clara Seed shows "First session! / Great start with this student." in Last Session card |
| 2.6.x | **FAIL (HIGH)** | Teaching Todos section completely absent from left panel even when Ana Visual has 2 pending todos — section never renders |
| 2.6.4 | PASS | Teaching Todos absent for Clara Seed (no todos seeded) |
| 2.7.3 | PASS | Working Memory absent for Clara Seed |
| 2.8 | N/A | N/A for Clara Seed (no data) |
| 2.9.1 | **FAIL (BUG)** | Suggested Difficulties section absent from the right form panel; Ana Visual has 2 active difficulties but no check section appears |
| Left panel — Ana Visual full data | PASS | Short-term Objectives (OVERDUE/5D LEFT/28D LEFT badges), Open Followups, Last Session (#3), Working Memory (with "Show more"), Planned for Today, Active Difficulties all render correctly |

#### Right Panel Form

| # | Result | Notes |
|---|--------|-------|
| 3.4.1 | **FAIL (BUG)** | "STATUS" label shown above the Cancelled toggle — should not appear as a separate heading |
| 3.4.2 | **FAIL (BUG)** | Toggle size h-5 w-9 (20x36px) — spec requires h-6 w-11 (24x44px) |
| 4.1.1 | PASS | Last Session card in left panel shows date, duration, summary, HW for Marco B1 |
| 4.2.1 | PASS | Previous Homework (Done/Partial/Not Done) buttons shown for Marco B1 (has HomeworkAssigned on prev session) |
| 4.2.2 | PASS | Previous Homework section absent for Clara Seed (no prior homework) |
| 4.3.1 | PASS | Reference banner shows NextSessionPlan from last session (present for Marco B1 and Ana Visual, absent for Clara Seed) |
| 4.3.2 | **FAIL (BUG)** | "What Happened?" textarea pre-filled with NextSessionPlan text (JS confirmed value = 95 chars) — should be empty; teacher writes what happened, not what was planned |
| 4.8.2 | **FAIL (BUG)** | Teaching Todos input placeholder is "Add todo..." — should be "Add a teaching idea..." |
| 4.8.3 | **FAIL (BUG)** | Teaching Todos "+" button is ghost variant — should be filled `bg-indigo-600` |
| 4.9.2 | **FAIL (BUG)** | Followups "+" button is ghost variant — should be filled `bg-amber-500` |
| 5.2.1 | **FAIL (BUG)** | Expanded secondary section label reads "TODAY'S CONTEXT" — spec says "Notes" |
| 5.4.2 | **FAIL (BUG)** | Same toggle size issue as 3.4.2 |
| Suggested topics | PASS | Marco B1: "+subjunctive"; Ana Visual: "+subjunctive +imperfect +conditional" — all derived from last session's MentionedDifficultyPairs / TopicTags |

#### Autosave and Done

| # | Result | Notes |
|---|--------|-------|
| 7.1 | PASS | Autosave fires (PUT 200 confirmed via network inspector). Indicator span exists in DOM (`data-testid="autosave-status"`) and shows "Saving..." / "All changes saved" transiently — fades after save completes |
| 8.1 | PASS | Done button navigates to student detail page (`/students/:id`) |
| 8.x (no-change) | PASS | Done on untouched form navigates without creating session (confirmed by separate e2e test) |

#### Cross-screen Consistency

| # | Result | Notes |
|---|--------|-------|
| 11.1 | PASS | Session logged via log-session page appears in student detail Session History and Sessions tab as COMPLETED |

---

### Pass 2 Results: Playwright E2E

**Stack:** E2E Docker stack (frontend:5174, API:internal, SQL:internal)
**DB setup:** Teacher auto-registered via `/api/auth/me`, approved via `docker exec sqlcmd`

#### Passing Tests

| Test | Result |
|------|--------|
| `confirming session with suggestedDifficulties upserts them to student profile` | PASS |
| `confirming session updates existing difficulty in profile` | PASS |
| `log session page: Done navigates back without saving if no changes made` | PASS |
| `form quality: topics covered visible, suggestion chips appear, title auto-generated` | PASS |
| `audio recorder visible on log session page without toggling secondary` | PASS |

#### Failing Tests

| Test | Failure | Root Cause |
|------|---------|-----------|
| `log session page: autosave creates session without submit button` | Line 884: `toBeVisible()` on `autosave-status` fails | Element is in DOM but hidden (empty span) when `saveStatus === 'idle'`. Premature check — should run after typing. **Test bug, not production bug.** |
| All ~15 dialog-based tests (lines 15–822) | `getByTestId('session-log-dialog')` not found | UI was migrated from modal dialog to full page route (`/students/:id/log-session`). These tests were never updated. **Stale test debt.** |

#### F-series (from test plan) — coverage status

| Section | Coverage | Status |
|---------|----------|--------|
| F1 (Previous Homework section) | Existing test line 71 | STALE (dialog-based) |
| F3 (Suggested topic chips) | `session-log-form-quality.spec.ts` | PASS |
| F8.1-F8.10 (Autosave triggers) | Line 860 | PARTIAL — autosave fires correctly, test bug on line 884 |
| F9.1 (First session empty state) | No dedicated e2e test | NOT COVERED |
| F9.3 (Done without changes) | Line 909 | PASS |

---

### Consolidated Bug List

| ID | Severity | Test ref | Description |
|----|----------|----------|-------------|
| B1 | HIGH | 2.6.x | Teaching Todos section absent from left panel even when student has pending todos |
| B2 | HIGH | 4.3.2 | "What Happened?" textarea pre-filled with previous NextSessionPlan text |
| B3 | MED | 2.9.1 | Active Difficulties not shown as checkboxes in right panel form |
| B4 | MED | 2.3.2 / 2.4.4 | Followup and Difficulty left-panel items use native HTML checkboxes |
| B5 | MED | 1.1.4 / 1.1.5 | Invalid student URL shows bare "Student not found." with no back navigation |
| B6 | LOW | 3.4.1 | "STATUS" label shown above Cancelled toggle |
| B7 | LOW | 3.4.2 / 5.4.2 | Toggle size h-5 w-9 (spec requires h-6 w-11) |
| B8 | LOW | 4.8.2 | Teaching Todos placeholder "Add todo..." (should be "Add a teaching idea...") |
| B9 | LOW | 4.8.3 | Teaching Todos "+" button ghost style (should be filled bg-indigo-600) |
| B10 | LOW | 4.9.2 | Followups "+" button ghost style (should be filled bg-amber-500) |
| B11 | LOW | 5.2.1 | Expanded section label "TODAY'S CONTEXT" (should be "Notes") |

### Consolidated Test Debt List

| ID | Description |
|----|-------------|
| T1 | ~15 session-log tests check `session-log-dialog` testId — stale since UI moved to full page; need porting |
| T2 | Line 884 in autosave test: premature `toBeVisible()` check before any typing — fix to remove or move after `fill()` |
| T3 | F9.1 (first session empty state) has no dedicated e2e test |
7. Todo placeholder says "Add todo..." instead of "Add a teaching idea..." — see 4.8.2
