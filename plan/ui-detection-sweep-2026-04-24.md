# UI Detection Sweep — 2026-04-24

**Branch:** sprint/stabilisation
**Viewport:** Desktop 1280x800 (primary), mobile 375px (secondary via profile-tab screenshots)
**Pages reviewed:** 30 screenshots across 19 distinct screens
**Spec pass rate:** 29/31 (1 test failure = real UI bug; 1 not run due to dependency)

---

## Critical (blocks core teacher workflow)

| Screen | Finding | Repro | Design-system ref |
|--------|---------|-------|-------------------|
| Student Detail / Sessions tab | **Session inline edit is broken — no editable inputs appear when row is expanded.** The spec `@visual student detail sessions tab - expanded row with editable fields` fails because `session-title-input` does not exist in the DOM. The expanded row shows read-only `session-title-display` only. Per DS 8.3, the expanded row must render editable Pattern A fields. | Navigate to any student, Sessions tab, click to expand a session row. | DS §8.3 Session Row Inline Edit |
| Dashboard hero card | **TOPICS field shows a bare comma "," as content.** The last session briefing card on the Dashboard renders `TOPICS: ,` when a session has an empty topic tag entry. `lastSessionTopicTags.join(', ')` produces a lone comma when the array contains a single empty string `['']`. Teacher sees corrupted data before every class. | `dashboard.png` (top card, TOPICS row) | Data integrity, teacher trust |

---

## Major (noticeable UX/polish problems)

| Screen | Finding | Repro | Design-system ref |
|--------|---------|-------|-------------------|
| Session History — edit dialog | **"Previous homework status" dropdown renders the raw enum value "NotApplicable" to the user.** In the `session-history-edit-dialog.png` the `<select>` shows "NotApplicable" as an option and as the currently-selected value. This is a leaking enum name, not a human label. Expected: "N/A" or "Not tracked". | Open Sessions list, click any row, edit session modal. | UX copy quality |
| LogSession (create mode) | **STUDENT DIFFICULTIES section uses native `<input type="checkbox">` elements** instead of the custom toggle controls specified in DS §11.4. The checkboxes in `session-log-create-with-topics.png` and `session-log-create-no-topics.png` show plain browser checkboxes for both the Teaching Todos and Followups lists. | Open LogSession for any student with difficulties. | DS §11.4 "Never use native HTML `<input type="checkbox">` for todo or followup items" |
| Settings page | **Sidebar nav label reads "My Profile" in the settings screenshot (settings-telegram-pending.png) but "Settings" in the standard screenshot.** Two different screenshots show inconsistent nav label text for the same route. The nav item label should be consistent. | Navigate to /settings, scroll. `settings-telegram-pending.png` shows "My Profile" as active item label. | DS §6 Layout Shell "Active nav item: primary color indicator" |
| Edit Student form | **"Save Student" / "Cancel" button pair present on the Add Student form but DS §8 Pattern C says the Done button navigates back only — there is no Save trigger.** `students-new.png` shows a "Cancel" + "Save Student" button pair at the top right. The edit form (edit mode) correctly uses a "Done" button, but the Create form diverges. | Navigate to /students/new. | DS §8.1 Pattern C |
| Student Detail / Overview tab | **"IDEAS PARA CLASES" section header is in Spanish on an English-language UI.** All other sections use English labels ("PENDING FOLLOWUPS", "PEDAGOGICAL PROFILE", "LAST SESSION"). "IDEAS PARA CLASES" is never translated. | `student-detail-overview-sessions.png`, right column header. | Design direction: professional, consistent |
| Session History tab | **Expanded row for a "SCHEDULED" session (not yet logged) shows minimal content** — only "WHAT WAS PLANNED" and "Logged yesterday" in `session-history-expanded.png`. There is no visual distinction from completed sessions in the collapsed state except the "SCHEDULED" badge. The edit affordance is absent. A teacher has no way to log the session from here. | Navigate to Diego Seed, Sessions tab, expand "Session, Apr 27 SCHEDULED". | DS §8.3 |
| Student Detail / Profile tab (desktop) | **Two different layouts exist for the Profile tab depending on viewport.** At 1280px (desktop) the profile tab layout (`student-detail-profile-tab.png` / `ana-visual-profile-tab.png`) shows a two-column layout with FOCUS AREAS & DIFFICULTIES on the left and IDENTITY DETAILS etc. on the right. At narrower width (`student-profile-tab.png`, 920px) the layout stacks with DIFFICULTIES appearing in the right column. This is a different page structure not a responsive reflow — sections appear and disappear. | Compare `ana-visual-profile-tab.png` (wide) vs `student-profile-tab.png` (mobile). | DS §6 consistency requirement |
| Progress tab | **"No skill assessments recorded yet" empty state misleads.** Diego Seed has skill overrides set (Reading B2, Writing A2, Speaking B1, Listening B1 visible on sessions tab) but the Skill Imbalance Analysis shows "No skill assessments recorded yet. Edit the student profile to add skill-level overrides." The data is there but not being picked up by the chart. | `progress-dashboard.png`. | Empty states must be accurate (DS §9) |
| Session List (global /sessions page) | **"CONFIRMED" status badge is shown for all sessions** regardless of actual status in `sessions-list.png`. All entries — upcoming, recent, historic — show "CONFIRMED". There are no draft, cancelled, or unconfirmed sessions visible even though the seed data includes them. This may be a filtering/display bug. | Navigate to /sessions. | Data fidelity |
| LogSession (edit mode) | **"Edit Session" H1 heading inconsistency.** The `session-log-edit-mode.png` and `session-edit.png` both show "Edit Session" as a bold heading inside the right pane while the left pane shows student context. The heading appears mid-page without page-level context. A teacher returning to edit a past session sees two header areas (top bar with "Last saved yesterday" + "Done", and the in-body "Edit Session" heading), creating double-header confusion. | Open a session in edit mode from student detail. | DS §3 Visual Hierarchy |

---

## Minor (polish, consistency, nice-to-have)

| Screen | Finding | Repro | Design-system ref |
|--------|---------|-------|-------------------|
| Dashboard hero card | **"SESSION #1" subtitle shows generic number** rather than a meaningful descriptor for the first session (e.g. "FIRST SESSION"). On `dashboard.png`, the next-up card shows "ENGLISH · SESSION #1" which is accurate but could say "FIRST SESSION" for session #1 to be more encouraging. | `dashboard.png` | DS §1 warmth/encouragement |
| Dashboard layout | **"LAST SESSION · MAR 28" date in dashboard hero card uses all-caps abbreviated month** ("MAR 28") while all other date formats across the app use full month names ("Apr 21, 2026", "APR 27", etc.). Inconsistent date formatting. | `dashboard.png` hero briefing card vs sessions-list.png | DS §3 Typography consistency |
| Students list | **"Cancelled 2x" signal badge uses a dark/black background** for Clara Seed and Nataliya Seed in `students-list.png`. This deviates from the design system's warm/professional color tokens. The "RETURNING" badge also uses near-black background. No design spec for these badge colors exists — they appear to be ad-hoc colors. | `students-list.png`, Signals column | DS §2 color palette — badge colors not in token set |
| Student Detail header | **Two different header layouts between profile tab screenshots.** In `student-detail.png` (AppShell layout), the header shows: avatar, name+CEFR badge, subtitle, status pills, session count, goal. In `ana-visual-profile-tab.png` (wider viewport), the header is condensed to just avatar, name, CEFR badge, language. The goal row and status pills are missing in the wider layout. | Compare `student-detail.png` vs `ana-visual-profile-tab.png`. | Cross-screen consistency |
| Student Overview tab | **The "Teaching Todos" item toggle uses a native `<input type="checkbox">`** (visible as plain square checkbox) in `student-detail-overview-sessions.png` right panel "IDEAS PARA CLASES" column. Adjacent to it, the Pending Followups panel correctly uses the custom amber circle toggle. Two different toggle patterns for list-add items on the same screen. | `student-detail-overview-sessions.png`, right panel. | DS §11.4 — custom toggle required |
| LogSession — left panel | **Duration select shows "other" as selected value** in edit mode (`session-log-edit-mode.png`). The field reads "other" with no unit. The "min" text label appears separately to the right. If duration is "other" it should either require a free-text input or the option label should include the unit context. | Open an existing session in edit mode; duration was entered as a non-preset value. | DS §11.3 label clarity |
| LogSession — cancelled state | **"Saving..." spinner visible in top-left of cancelled screenshot** (`log-session-cancelled.png`). This is probably a transient state captured by the test, but the saving indicator position (top-left near the back arrow) is small and easy to miss. DS §8.2 specifies SavedIndicator location near the field. | `log-session-cancelled.png` | DS §8.2 SavedIndicator location |
| Onboarding — name field pre-populated with email | **The "Your name" field in the landing screenshot is pre-filled with `e2e-test@langteach.dev`** (the email address). `landing.png` shows the email in the name field. The user's email should NOT be the default for their display name — it leaks PII and creates bad first impressions. | Navigate to /onboarding fresh. | UX best practice |
| Lesson Editor | **Section cards have 1px visible borders** around the Warm Up and Presentation blocks in `lesson-editor.png`. Per DS "The No-Line Rule: Borders between sections are forbidden." The lesson editor sections use bordered cards rather than tonal layering. | `lesson-editor.png` | DS §2 No-Line Rule |
| Lesson Editor toolbar | **"Log session" button in the lesson editor toolbar** (`lesson-editor.png` top bar) appears next to "Generate Full Lesson", "Preview as Student", etc. This action is contextually confusing in a lesson creation context. The button style also matches "Preview as Student" (outlined), not the primary gradient style. | `lesson-editor.png` top toolbar | DS §5 Button hierarchy — "Primary and Secondary buttons on the same row must belong to the same visual family" |
| Study View (student preview) | **The study view has no visual container or centering constraint** — content starts at the left edge of the page area with no max-width card (`study-view.png`). For a student-facing view, the reading experience should be centered with a comfortable line-length (~65ch). The lesson sections are left-aligned with no grouping hierarchy. | `study-view.png` | DS §1 editorial quality |
| Course Detail | **"Mark as taught" and "Edit lesson" buttons in the course curriculum list** (`course-detail.png`) use different border-radius: "Mark as taught" appears to have a `rounded-md` border and a green border, while "Edit lesson" uses `rounded-md` with outlined style. The icon on "Mark as taught" (checkmark) + text + border creates a visually busy action button. | `course-detail.png` lesson rows | DS §5 Button variants |
| Courses list | **Progress bar for "B2 English — C1 Preparation" (1/8 sessions) is nearly invisible** — a 1-2px blue line on a grey track. The bar for "B2 English General Course" (1/3) is clearly visible. The visual feedback for very small progress (1/8 = 12.5%) is below threshold for perception. | `courses-list.png` | Accessibility — WCAG 1.4.11 non-text contrast |
| Settings / Telegram integration | **The Telegram token code block** uses a monospace font in a rounded pill background (`settings-telegram-pending.png`). The code `/connect QMJRU8AV` renders with the token in a light indigo background, which looks reasonable, but the copy icon next to it has no visible focus state and no aria-label visible in the screenshot. | `settings-telegram-pending.png` | DS §7 accessibility — icon buttons need aria-label |
| Student Profile tab (all students) | **`[visual-seed]` raw seed marker text is visible** in the "SENSITIVITIES / LIFE CONTEXT" field for Ana Visual and Marco Visual (`ana-visual-profile-tab.png`, `student-profile-tab.png`). This is test seed data appearing in production-facing UI rendering. While expected in e2e, it reveals the field is not sanitized in the display layer. | Profile tab → SENSITIVITIES / LIFE CONTEXT. | Data quality |
| Session Edit modal (legacy dialog) | **The edit dialog from Sessions list** (`session-history-edit-dialog.png`) uses a plain `<select>` for "Previous homework status" which shows the raw enum string "NotApplicable". This old modal pattern contradicts the three-button pill pattern used in the LogSession page for the same field. Two different UI patterns for the same field across two screens. | Session list → click session row. | DS §8 "Consistency is kindness. Breaking rhythm breaks trust." |
| LogSession — "STUDENT DIFFICULTIES" section label | **Section label reads "STUDENT DIFFICULTIES"** in the left panel of LogSession (`session-log-create-with-topics.png`). This is a read-only informational section for the teacher's reference. The label is functional but the section has no visual differentiation from the interactive sections above it. It blends into the layout without a clear visual cue that it is read-only reference information. | LogSession left panel, scroll down. | DS §1 "Show, don't explain" |
| Dashboard — Quick Actions card | **"New Student" CTA uses an outlined style** while "New Lesson" uses the primary indigo gradient fill. Per DS §5, "Primary and Secondary buttons on the same row must belong to the same visual family" and a ghost button next to a filled primary is not allowed — use Secondary instead. | `dashboard-top.png`, Quick Actions card. | DS §5 Button rule |

---

## Cross-screen / systemic issues

1. **Two "Log Session" entry points, two different patterns.** From Student Detail, the "Log Session" button navigates to the full LogSession page (full two-panel experience). From the old dialog reachable via Sessions list chevron, a modal dialog opens with the legacy form. The teacher encounters fundamentally different UI for the same action depending on where they start. The dialog version needs to be retired or redirected.

2. **Checkbox inconsistency across screens.** Native `<input type="checkbox">` appears in LogSession (TEACHING TODOS, FOLLOWUPS, STUDENT DIFFICULTIES), while the Overview tab correctly uses the custom amber circle toggle for followups but native checkbox for todos. DS §11.4 explicitly forbids native checkboxes for these use cases.

3. **CEFR badge shape inconsistency.** In the Students list, CEFR badges use a `rounded-full` (pill/oval) shape (`students-list.png`). On the student detail header, the badge uses a more squared shape. DS §5 specifies "Square-format badge with `md` (0.375rem) radius — not pill-shaped."

4. **Date format heterogeneity.** At least three date formats in use: "MAR 28" (abbreviated all-caps, dashboard hero), "Apr 21, 2026" (sessions list), "APR 21" (session row date badge). The DS does not specify a canonical date format, but the mixed styles feel unintentional.

5. **"0 / 50 generations" counter in sidebar.** Visible in all session-related screenshots showing the compressed sidebar (e.g., `student-profile-tab.png`, `ana-visual-profile-tab.png`). This usage counter appears at the very bottom of the sidebar before the user avatar. In the AppShell it appears only in certain viewport widths. The counter's visual weight (small muted text) and position are inconsistent between screenshots.

6. **Active nav indicator implementation differs between screens.** On the main AppShell screens (Dashboard, Students, etc.) the active nav item shows a left-border colored bar + filled background (`bg-indigo-50` or similar) — the whole item lights up. DS §6 specifies "primary color indicator, not a background fill." The two behaviors (indicator + fill vs just indicator) are both present.

7. **Student Detail header shows inconsistent content between Overview and Profile tabs.** When on the Overview tab, the header shows: CEFR badge inline with name, status pills (ACTIVE, CORPORATE), "Next: Mon, Apr 27" pill, session count, GOAL row. When viewing Profile tab at wide viewport (`ana-visual-profile-tab.png`), the header is stripped to just the avatar + name + CEFR badge + language, with no status pills or goal. The header should be stable across tabs.

---

## Positive observations (what's working well)

- **LogSession page (create mode) is the strongest screen in the app.** The two-panel layout (context left, form right) is a genuinely smart design pattern. The left panel surfaces exactly what a teacher needs 5 minutes before class: objectives, last session, planned topics, difficulties. The right panel is uncluttered. The "Record your session" audio panel is polished with a clear gradient call-to-action.

- **Student roster signals column is excellent.** The `students-list.png` signal badges (Exam prep, Review pending, Cancelled 2x, Inactive 21d, Returning, NEW) provide rich at-a-glance teacher intelligence. The color coding is mostly consistent and immediately actionable.

- **CEFR Pedagogical Profile section on Overview tab** shows skill bars with level labels (Reading B2, Speaking B1, Writing A2, Listening B1) and "Working on:" note. This is clean, information-dense, and visually balanced.

- **Course detail page** is clean and functional. The session list with numbered rows, drag handles, status badges (Draft, Not generated), and per-row actions (Mark as taught, Generate lesson, Edit lesson) is the right pattern for curriculum management.

- **Teaching Todos and Pending Followups on student Overview tab** use distinct color families (indigo vs amber) as specified in DS §11.2. The visual separation is clear.

- **Dashboard "Needs Preparation" card** with "All caught up!" empty state is pleasant and reassuring. The design communicates positive information rather than showing a blank card.

- **Sessions list page** is well-structured with date grouping (UPCOMING / RECENT), time display, student name, CEFR badge, topic preview, and status chip. Clear and easy to scan.

- **Onboarding flow** is clean, step-indicated, and uncluttered. The chip-toggle pattern for "Languages I teach" / "CEFR levels I teach" / "Preferred content style" is consistent and learnable.

---

## Test infrastructure note

All 31 visual specs require `DB_PORT=1435 VITE_API_BASE_URL=http://localhost:5178` to be passed explicitly when running outside the start-visual-stack.sh wrapper. The wrapper script comment mentions `DB_PORT=1435` but does not export it into the test runner environment. One test (`@visual student detail sessions tab - expanded row with editable fields`) fails because the spec expects `session-title-input` to exist in the expanded row but the component only renders `session-title-display` (read-only). This is the same finding as Critical item #1 above.

---

## Summary counts

| Severity | Count |
|----------|-------|
| Critical | 2 |
| Major | 9 |
| Minor | 16 |
| Systemic/cross-screen | 7 |

**Total distinct findings: 34**
