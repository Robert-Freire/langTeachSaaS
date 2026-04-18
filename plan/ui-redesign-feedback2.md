# UI Redesign Feedback 2 — Post-Implementation Review

Vera, 2026-04-15. Live review at `localhost:5173`. Side-by-side with Stitch mockup.

---

## 1. Dashboard

### Stitch gaps

- **(MEDIUM) Today's Agenda missing per-row status labels and Calendar View link.** Stitch shows each row with a status: DONE (past sessions), NEXT SESSION (highlighted), SCHEDULED (future). The code only highlights the next row visually but doesn't label the others. Also missing: "CALENDAR VIEW" link in the card header.

- **(MEDIUM) Hero card missing student identity subtitle.** Stitch shows the language being studied and session count inline under the student name ("Italian · Session #14"). Live: none. The teacher should see the language context and relationship length at a glance without opening the profile.

- **(MEDIUM) Followup time labels use developer shorthand.** Stitch: "3 DAYS OVERDUE", "YESTERDAY", "TODAY". Live: "3D OLD". Needs natural language. Also, Stitch doesn't show a student name chip above each followup -- the item text stands on its own. Live adds a "NATALIYA" chip which creates noise when there are many followups.

- **(MEDIUM) Followup urgency dots are all the same.** Stitch uses filled amber for overdue items and a muted gray dot for less urgent ones. Live uses the same filled dot regardless of age.

- **(MEDIUM) Roster uses absolute dates, Stitch uses relative.** "13 Apr" requires mental arithmetic. "4d ago" is immediately scannable. NEXT SESSION in Stitch also shows time when available ("Thu, 15:00", "Today, 10:30").

- **(LOW) Signal badge variety is incomplete.** Stitch shows "CANCELLED 2X" (dark badge) and "REVIEW PENDING" (indigo badge) in addition to "INACTIVE Xd". These either aren't triggering or aren't implemented for the current data.

- **(LOW) Column header "SIGNAL" should be "ACTIVITY SIGNAL".** More self-explanatory.

### Other fixes

- **(HIGH) Add session time entry to Log Session form.** Sessions currently have no time field, so all sessions default to 00:00. The hero card countdown never fires and every session shows midnight as the time. Fix: add a time picker to Log Session. Short term: hide the time when it's 00:00 rather than displaying it.

- **(HIGH) Populate native language in seed data for all students.** The L1 column shows "—" for all 35 students because `nativeLanguages` is empty. "L1" as a column label is also unclear -- consider renaming to "Native" or "L1 (Native)". Seed fix: set native language for each seeded student.

- **(MEDIUM) Fold NEXT column into LAST as a paired display.** Most teachers don't pre-schedule, so NEXT is "—" for 34 of 35 students. Show "13 Apr → 17 May" only when a next session exists, plain "13 Apr" otherwise. Removes an empty column without losing information.

- **(LOW) SIGNAL column is empty for most active students.** The top 20 students have no signal at all, making the column mostly whitespace. Consider hiding the column header when no signals exist in the current view.

- **(LOW) Today's Agenda empty state is too tall.** "No sessions this week" is vertically oversized for a one-line message. Tighten the card min-height.

---

## 2. Student Roster

### What was fixed since Round 1 (#718)

All round 1 findings were addressed: sort default changed to Last Session, SIGNALS renamed to ALERTS, subtitle drops "active", subtitle updates when a CEFR filter or search is active ("Managing 1 B2 learner in your atelier" / "Showing 0 results for 'nat'"), sort control replaced with custom text style (no border), Load More centered, search bar moved to leftmost position per Stitch, alert badges use filled amber pill with white text, row hover uses warm lavender (not cold gray), filter/search/pagination state persists in URL (back navigation preserved), pencil edit icon removed from rows.

### New findings

- **(HIGH) Search input drops keystrokes under real-time URL sync.** Typing "nat" produced "nt" in the input: the "a" was swallowed between URL-triggered re-renders. Each keystroke updates `useSearchParams`, which re-renders the component and momentarily steals focus from the input. The teacher types a student name and gets empty results without knowing why -- a silent error (Nielsen #5, error prevention). Fix: buffer the value in local `useState`, debounce the URL sync at ~300ms. Keystrokes land on local state immediately; the URL updates only when typing pauses.

- **(MEDIUM) Row click zone bleeds into the footer below the last row.** Clicking at the visual position of the "Load more" text without a direct element ref navigates to a student instead of loading more. The row `onClick` handler extends beyond the rendered row height into the whitespace beneath it. On a tablet or imprecise trackpad this is a real hazard: teachers trying to load more will land inside a student profile. Fix: constrain row click area to the row's rendered height; give the Load More button its own capture zone.

- **(MEDIUM) Only "Inactive Xd" alert type appears in seeded data.** After loading 24 of 35 students, every alert badge is an inactivity badge. NEW, RETURNING, CANCELLED, REVIEW PENDING, and EXAM PREP signals are absent. The alerts column reads as a single-purpose inactivity tracker rather than the triage tool it is designed to be. Seeder needs students in varied alert states to demonstrate the full system.

- **(LOW) CEFR badge padding still narrow vs. Stitch.** Badges use `px-1.5 py-0.5`. Stitch shows more horizontal breathing room; `px-2` would get there. CEFR level is a high-frequency scan target -- extra padding speeds reading.

---

## 3. Student Detail -- Header (all tabs)

- **(HIGH) Native language (L1) still missing from the header.** Issue #719 called for a subtitle under the student name ("Ukrainian speaker · Software Engineer, Kyiv"). The frequency indicator ("11 sessions in 12 weeks") was implemented correctly, but L1 is still absent. For a teacher switching between students, native language is the first thing that changes their teaching approach.

---

## 4. Student Detail -- Overview Tab

- **(HIGH) Overview doesn't fit in one viewport.** The no-scroll constraint (everything visible before class) isn't met: Teacher's Working Memory is cut off at the bottom. Fix: limit Session History to 1 compact card instead of 2 full-height cards.

- **(MEDIUM) Ideas para Clases has two competing empty-state messages.** "Any topic Nataliya would enjoy practising?" AND "No ideas yet. Add one below." -- redundant. Remove the second one, keep the rotating prompt.

- **(MEDIUM) Session History: missing duration on one card.** One card shows "60min", the other shows nothing. When no duration was logged, omit the duration line entirely rather than leaving an asymmetric pair.

- **(LOW) Session title truncates mid-word.** "Comprensió..." should end at a word boundary with "...". Fix the truncation so it doesn't cut inside a word.

---

## 5. Student Detail -- Profile Tab

- **(CRITICAL) "dsadasd" test artifact in motivation banner and interests.** Raw junk string visible in the motivation banner top-right and as an interest chip. Must be cleaned from seed data before any demo.

- **(HIGH) Motivation banner lacks editorial treatment.** Shows `"to fly"` in italic in a lavender band. Stitch target: large Manrope display text, key phrase highlighted in indigo italic, interest chips integrated into the banner. Currently reads as a form field, not a pedagogical anchor.

- **(HIGH) Pedagogical Diagnostic has no tonal card container.** The graduation cap icon is there but Learning Goals, Objectives, Skill Assessment, and Focus Areas all sit on the same white surface with no grouping. They should be wrapped in a `surface-container-low` tonal card to read as one cohesive learning plan.

- **(MEDIUM) Language Ecosystem: "spoken: spanish" is lowercase.** "Spoken: spanish" vs "Learning: Spanish B1" -- inconsistent. Language names should be proper-cased. Also: Nataliya's native language (Ukrainian) is not visible -- seed data needs to set it.

- **(MEDIUM) Hourly rate shows "14" with no unit.** Without "EUR" or "/hr" the number is meaningless. Fix the display format to show the unit, or update the seed value to include it.

- **(LOW) Seed data typo: "travel to sapin".** Should be "travel to Spain".

---

## 6. Student Detail -- Sessions Tab

- **(HIGH) TOTAL HOURS shows "1" for a student with 11+ sessions.** Only one session has duration recorded. "1 hour" is actively misleading. Fix: hide the TOTAL HOURS stat when fewer than half the sessions have duration data, or show "Incomplete data" in muted text.

- **(HIGH) Session titles are all "Session, [date]".** Generic fallback because teachers rarely write a title. Auto-generate titles from the session narrative at save time. "Session, Mar 23" tells the teacher nothing when scanning history.

- **(MEDIUM) "hecho" as full session narrative looks broken.** Valid input (Spanish for "done") but a single word in a collapsed row reads like a bug. Title auto-generation should still produce something useful even for sparse narratives.

- **(LOW) "Next:" inline preview has inconsistent visual weight.** Only the Apr 10 session shows the next-class plan inline. The treatment (small teal text) is too easy to miss. Use the amber "Planned for Next Class" accent to give it the same weight as the expanded view.

---

## 7. Student Detail -- Progress Tab

- **(HIGH) Difficulty text is still truncated.** "tenia un poco de dific..." -- flagged HIGH in the original review, still not fixed. The specificity IS the information. Fix: allow text to wrap in the Difficulties Summary card.

- **(HIGH) Baseline marker is too subtle.** The thin gray tick reads as a grid line, not a target. Make it thicker (2px), use indigo or amber as the color, and add a small "B1 target" label. This is the most important visual element on the chart.

- **(MEDIUM) No red-flag signal for skills 2+ levels below baseline.** Reading at A2 (2 levels below B1) uses a lighter bar color, which is correct, but a teacher shouldn't have to derive the gap mentally. Add an amber accent on the badge when any skill is 2+ levels below the general CEFR.

- **(LOW) "Behind" pacing badge has no context.** Behind relative to what? Add a subtext line: "Avg. 1.0/wk, target 1.5/wk".

---

## 8. Additional Findings -- 2026-04-16 Re-review (Student Detail)

### Overview Tab

- **(HIGH) Viewport constraint still not met.** Teacher's Working Memory is cut off at the bottom of the screen. Confirmed unresolved. The teacher has to scroll to reach the one section they need most before a class.

- **(MEDIUM) PENDING FOLLOWUPS card has excessive dead space.** The three-column grid locks card heights to the tallest card (Pedagogical Profile). With only one followup item, the card is half-empty. On first load this reads as "nothing here" rather than "one item". Fix: either use a fixed card height with internal scroll, or use a masonry/independent-height layout for the three columns.

- **(MEDIUM) IDEAS PARA CLASES has no visible inline input.** The "+" button is in the card header but there is no input field visible without interaction. PENDING FOLLOWUPS has an inline "Add followup..." field always visible. The discoverability gap means teachers will see the empty state and not know how to act. Fix: show an inline "Add an idea..." input below the empty-state message, consistent with the followups card pattern.

- **(MEDIUM) "Ideas para Clases" (Overview) and "Teaching Todos" (Profile) are the same concept with two different names.** Both tabs show the same data under different labels. A teacher adding an idea on Overview and then opening Profile will see "Teaching Todos" and not know if it's the same list. Fix: pick one canonical name (sprint story uses "ideas para próximas clases") and use it consistently on both tabs. Consider whether showing it on both tabs is necessary -- the Profile tab sidebar could link to the Overview instead.

- **(MEDIUM) PENDING FOLLOWUPS appears on both Overview (left column) and Profile (right sidebar).** Same duplication issue as above. No visual indication that these are the same data. A teacher might try to add a followup from Profile and not realize it also appears on Overview. If the duplication is intentional, add a subtle "also on Overview" affordance or a shared-data indicator.

### Profile Tab

- **(HIGH) Personal info fields (age, profession, location) are nowhere visible.** The sprint explicitly scoped these: "age, profession, location, native language, other languages known, reason for studying Spanish." I can see Language Ecosystem, Interests, Commercial, and the motivation banner -- but no dedicated personal info section. Age, profession, and location are either missing from the implementation or hidden under "Show all sections." If behind a toggle, they need to be surfaced by default since they're core to teaching context.

### Sessions Tab

- **(MEDIUM) "Vera test session" in seed data is an artifact, same category as "dsadasd".** The Apr 13 session is titled "Vera test session - reviewed preterite vs imperfect." The "Vera test session" prefix is clearly a test artifact. Needs to be cleaned from seed data before any demo.

- **(LOW) Stat card contrast: TOTAL HOURS "1" vs Progress showing "12 total completed sessions".** A teacher who opens both tabs sees "1 hour" on Sessions and "12 sessions" on Progress. These are different metrics but the visual weight is the same, and the gap is jarring. Add a label clarifying "1 hour recorded" (not total) or resolve by backfilling duration data.

### Seed Data Fixes (cross-cutting)

| Fix | Screen | Action |
|-----|--------|--------|
| Remove "Vera test session" prefix from Apr 13 seed session title | Sessions | Fix seed |

---

## 9. UX Pattern Standard -- Edit/Save Interaction (Cross-Screen)

Vera, 2026-04-16. Derived from audit of Edit Student screen, Profile tab, and Sessions tab.

### Problem

The app currently uses three different models for saving changes:
1. **Autosave on blur** -- Edit Student screen (all fields)
2. **Explicit Save/Cancel** -- Profile tab Motivation and Interests inline edits
3. **Immediate add per item** -- Teaching Todos, Pending Followups, Ideas para Clases

This creates an inconsistent mental model. The teacher can't predict what will happen when they finish editing something.

### The Standard

**Rule 1 -- Autosave on blur for single-value fields.**
Any field holding one value (text, textarea, select, CEFR level, date) saves when the teacher clicks away from it. No Save button. No Cancel button. This is already the Edit Student screen's model and it is correct. Apply it to: Motivation banner, any future inline single-value edits on the Profile tab, session title/duration in expanded row.

**Rule 2 -- Immediate-add for growing lists.**
Any field that appends an item to a list (todos, followups, interests chips, learning goals) adds the item on Enter or the dedicated add button. The item appears immediately. Remove individual items with × or a delete icon. No Save/Cancel. This is already what Teaching Todos and Pending Followups use. Apply it to: Interests on the Profile tab (drop the Save/Cancel, match the chip input behavior already present in Edit Student's Background tab).

**Rule 3 -- Always show a "Saved" flash after autosave.**
Autosave without feedback creates anxiety ("did it save?"). After every blur-triggered save, show a brief "Saved ✓" indicator -- either in the field itself, in the card header, or as a small toast -- that fades within 1.5 seconds. Notion and Linear both do this. Without it, autosave feels unreliable even when it isn't.

**Rule 4 -- Sessions: autosave on row collapse.**
When the session inline edit is implemented (expanded row), the save trigger is collapsing the row. The teacher edits, then clicks elsewhere or collapses -- that's the commit. No Save button in the expanded state. If there are unsaved changes and the teacher navigates away entirely, show a brief "Saving..." indicator.

**Rule 5 -- "Done" is navigation, not a save trigger.**
The Edit Student screen's "Done" button navigates back to the profile. It is not a save button. Saves have already happened field-by-field on blur. This distinction must be preserved on any future full-page edit screens.

### What This Eliminates
- All Save/Cancel buttons from the Profile tab inline edit modes (Motivation, Interests)
- The Cancel button click-target bug (no Cancel = no bug)
- The three-model inconsistency

### What This Requires
- Autosave API calls on blur for every inline editable field on the Profile tab
- "Saved ✓" feedback component (one shared component, used everywhere)
- Session row edit: save on collapse rather than on button click

---

## 10. Interaction Review -- 2026-04-16 (Student Detail, Profile Tab)

Live interactions tested on Nataliya's profile. All bugs below are reproducible.

### Confirmed from user review notes

- **(HIGH) Cancel button not clickable by mouse in edit modes.** Tested on both Motivation and Interests edit modes. Clicking Cancel by coordinate has no effect -- the button visually exists but does not receive click events. JavaScript `.click()` works. Cause is likely a z-index or pointer-events issue on a parent element capturing the click. A teacher who accidentally opens Motivation edit mode has no visible way to escape it. Fix: diagnose the pointer-events layering on the edit mode container.

- **(MEDIUM) Edit Student and Log Session buttons have inconsistent shape and weight.** Edit Student is a ghost/secondary pill (light fill, pencil icon). Log Session is a filled indigo primary button (gradient, notebook icon). Both are in the same header row. Different shapes, different visual weights, different colors. The Academic Atelier spec says Secondary should use `surface-container-high` background with `primary` text -- Edit Student should follow this, not a ghost variant. Fix: align Edit Student to the Secondary button spec. Or elevate Edit Student to a borderless ghost and keep Log Session as primary -- but the two need to feel like they belong in the same button family.

- **(MEDIUM) Pending Followups column placement (left) vs center.** The Overview three-column layout puts PENDING FOLLOWUPS left, PEDAGOGICAL PROFILE center, IDEAS PARA CLASES right. The center draws the eye first. Pedagogical Profile is reference data (rarely changes between classes). Pending Followups and Ideas para Clases are both pre-class action items. Putting static reference data in the prime position and action items in the periphery inverts teacher priority. Consider: IDEAS PARA CLASES or a merged "Before This Class" column in center, Pedagogical Profile moved right.

- **(HIGH) Teacher's Working Memory is hidden behind "Show all sections" on Profile tab.** Before clicking "Show all sections," TEACHER'S WORKING MEMORY does not appear in the right sidebar. After clicking it, TWM appears at the top of the sidebar. This section is one of the most important daily-use features (pre-class context), and burying it behind a toggle is a critical information architecture failure. "Show all sections" is a label for the Pedagogical Diagnostic left column -- it should not control visibility of an unrelated section in the right sidebar. Fix: always show TWM in the right sidebar; the current behavior appears to be a side-effect of the toggle wiring.

- **(MEDIUM) Inconsistent add interaction: Interests uses Save/Cancel, Teaching Todos and Pending Followups use add-immediately.** Tested live: Interests enters an edit mode with an explicit Save/Cancel pair (commit-based). Teaching Todos adds immediately when "+" is clicked (optimistic). Pending Followups adds immediately when "Add" is clicked. Three interaction patterns on one page for similar "add content" operations. The teacher builds a mental model from the first pattern they encounter and applies it everywhere. Fix: pick one model. Recommendation -- add-immediately works well for list-of-items (Teaching Todos, Followups). Interests should use the same: show a chip input that adds the tag on Enter/comma and removes on ×, no explicit Save needed. Motivation can keep Save/Cancel since it's a longer free-text field.

- **(MEDIUM) Motivation edit mode: clicking the banner to edit is not discoverable.** The Motivation banner becomes editable when clicked (or via the pencil in my testing). There's no affordance that it's editable in view mode -- no hover state, no edit icon visible until you hover. A teacher may never discover they can edit it. Fix: show a subtle pencil icon on hover over the banner, matching the pattern used on Interests.

### New interaction finding

- **(MEDIUM) Autosave vs Save/Cancel is inconsistent across the app and should be unified.** Current state: Motivation and Interests use explicit Save/Cancel (commit-based). Teaching Todos and Pending Followups use add-immediately (autosave per item). These two models are not inherently wrong, but mixing them on the same page -- and for semantically similar actions (adding short text content to a student record) -- forces the teacher to maintain two different mental models simultaneously. Recommendation: audit every editable field on the student detail and pick one strategy. For short-form list additions (todos, followups, interests chips), add-immediately is faster and feels lighter. For longer free-text fields (motivation), explicit Save is appropriate to avoid accidental overwrite. Document the rule so future screens follow it consistently.

- **(MEDIUM) Session edit is buried two interactions deep -- kebab then Edit.** The kebab menu on each session row contains only two items: Edit and Delete. Edit is the primary action a teacher takes on a session (adding notes, correcting duration, updating the narrative). Making it two clicks away -- first find the three dots, then click Edit -- adds unnecessary friction for the most common operation. The kebab pattern is appropriate when there are 4+ options, or when all options are secondary/destructive. Here it's protecting a single primary action. Options: (1) show an Edit pencil icon directly on the row on hover, with Delete remaining in a smaller secondary menu or behind a confirmation; (2) make the row itself double-clickable to enter edit mode (natural for a records list); (3) expand the row on click and show an Edit button inline in the expanded state. Double-click is the most space-efficient but least discoverable for a professional tool. Hover-revealed edit icon is the most explicit.

- **(MEDIUM) "Teaching Todos" (Profile) and "Ideas para Clases" (Overview) are confirmed same data.** I added "Try roleplay at the café" via Teaching Todos on Profile, then switched to Overview -- it appeared immediately in Ideas para Clases with a checkbox. Same list, two names, two locations. A teacher who sees "Teaching Todos" on Profile will look for it on Overview and find "Ideas para Clases" -- no indication they're linked. Fix: unify the name across both tabs (use "Ideas para clases" per the sprint story). Consider showing a "→ See Overview" link from Profile rather than duplicating the full list.

---

## 10. Seed Data Fixes (cross-cutting)

| Fix | Screen | Action |
|-----|--------|--------|
| Remove "dsadasd" from Nataliya's motivation + interests | Profile | Clean seed |
| Fix "travel to sapin" → "travel to Spain" | Profile | Fix seed |
| Add native language (Ukrainian) for Nataliya | Profile / Header / Roster | Set in seed |
| Add native language for all 35 seeded students | Dashboard roster | Set in seed |
| Backfill session durations (60min default) | Sessions / Progress | Seed or backfill |
| Fix hourly rate to include unit (e.g. "EUR 14/hr") | Profile commercial | Fix seed value |

---

## Summary: Priority Order

| Priority | Item | Screen |
|----------|------|--------|
| CRITICAL | Remove "dsadasd" test artifact | Profile |
| HIGH | Search input drops keystrokes on real-time URL sync | Student Roster |
| HIGH | Add session time entry to Log Session form | Dashboard + Log Session |
| HIGH | Native language missing from student detail header | Header |
| HIGH | Baseline marker too subtle on skill bars | Progress |
| HIGH | Difficulty text truncated in Difficulties Summary | Progress |
| HIGH | Session titles all "Session, [date]" -- auto-generate | Sessions |
| HIGH | TOTAL HOURS misleading with sparse duration data | Sessions |
| HIGH | Motivation banner missing editorial treatment | Profile |
| HIGH | Pedagogical Diagnostic lacks tonal card container | Profile |
| HIGH | Overview does not fit in one viewport | Overview |
| MEDIUM | Row click zone bleeds into Load More footer area | Student Roster |
| MEDIUM | Alert badge variety incomplete in seed data (only Inactive Xd) | Student Roster |
| MEDIUM | Today's Agenda missing status labels + Calendar View link | Dashboard |
| MEDIUM | Hero card missing language + session count subtitle | Dashboard |
| MEDIUM | Followup time labels ("3D OLD" → "3 DAYS OVERDUE") | Dashboard |
| MEDIUM | Followup urgency dots all same weight | Dashboard |
| MEDIUM | Roster absolute dates → relative ("4d ago") | Dashboard |
| MEDIUM | Fold NEXT into LAST as paired display | Dashboard |
| MEDIUM | Ideas para Clases double empty-state messages | Overview |
| MEDIUM | Session missing duration handled poorly | Overview |
| MEDIUM | Language Ecosystem lowercase + missing Ukrainian | Profile |
| MEDIUM | Hourly rate shown without unit | Profile |
| MEDIUM | "hecho" narrative looks like a bug | Sessions |
| MEDIUM | No red-flag signal for skills 2+ levels below baseline | Progress |
| LOW | CEFR badge padding narrow (px-1.5 -> px-2) | Student Roster |
| LOW | Signal badge variety incomplete (cancelled, review pending) | Dashboard |
| LOW | Column header "SIGNAL" → "ACTIVITY SIGNAL" | Dashboard |
| LOW | SIGNAL column empty for active students | Dashboard |
| LOW | Today's Agenda empty state too tall | Dashboard |
| LOW | Session title truncates mid-word | Overview |
| LOW | "Next:" inline preview inconsistent visual weight | Sessions |
| LOW | "Behind" pacing badge has no context | Progress |
| LOW | Seed data typo "travel to sapin" | Profile |
| HIGH | Personal info fields (age, profession, location) not visible | Profile |
| MEDIUM | PENDING FOLLOWUPS card has dead space with single item | Overview |
| MEDIUM | IDEAS PARA CLASES has no visible inline input (discoverability gap) | Overview |
| MEDIUM | "Ideas para Clases" and "Teaching Todos" are same concept, two names | Overview / Profile |
| MEDIUM | PENDING FOLLOWUPS duplicated on Overview and Profile with no indicator | Overview / Profile |
| MEDIUM | "Vera test session" seed artifact in Apr 13 session title | Sessions |
| LOW | TOTAL HOURS "1" vs Progress "12 sessions" -- jarring cross-tab contrast | Sessions / Progress |
| HIGH | Cancel button not clickable by mouse in Motivation and Interests edit modes | Profile |
| HIGH | Teacher's Working Memory hidden behind "Show all sections" toggle | Profile |
| MEDIUM | Edit Student vs Log Session buttons inconsistent shape and weight | Header (all tabs) |
| MEDIUM | Pending Followups in left column -- center should be pre-class action content | Overview |
| MEDIUM | Three different add interaction patterns on one page (save/cancel vs add-immediately) | Profile |
| MEDIUM | Motivation banner not obviously editable -- no hover affordance in view mode | Profile |
| MEDIUM | "Teaching Todos" / "Ideas para Clases" confirmed same data, unified name needed | Profile / Overview |
| MEDIUM | Save/Cancel vs autosave mixed on same page -- resolved by UX standard in section 9 | Profile (all sections) |
| MEDIUM | Session edit buried behind kebab -- use expanded row with autosave on collapse | Sessions |
| MEDIUM | Session inline edit: show Edit button in expanded row state (no kebab needed) | Sessions |

---

## 11. Edit Student Screen -- 2026-04-16 (Vera live review, Chrome + Stitch side-by-side)

### What works well

- **CEFR badge click-to-edit works correctly.** Clicking the B1 badge opens a Radix Select dropdown immediately. The pattern (badge in view mode, dropdown in edit mode) matches Stitch and is a smart interaction.
- **Autosave is correctly implemented.** Field-by-field saves on change/blur. "Done" navigates back without triggering a save -- correct behavior per the UX standard in section 9.
- **Sidebar (Teaching Todos + Pending Followups) renders correctly.** Both cards present on the right, sticky, and functional. Add-immediately pattern works on both.
- **Section scrollspy updates correctly** as the page scrolls.
- **Section nav scroll-to works** (confirmed via JS). The nav jump links scroll the `main` container to the correct section.
- **Learning Goals tree editor looks clean.** Collapse/expand chevron, leaf bullets, inline + and trash icons on hover.
- **Add/remove Objective interaction works** -- new row appears immediately, remove deletes without confirmation (appropriate for an empty row).

### Stitch gaps

- **(MEDIUM) Missing student photo/avatar field.** Stitch shows a photo in the top-right of the Basic Info card (round avatar, ~80px). Not implemented. For a demo, this is a visible gap -- Stitch shows "Ana Martins" with a photo; the live screen has an empty right column in the Basic Info row.

- **(MEDIUM) Languages section is separate from Basic Info.** In Stitch, Native Languages and Spoken Languages are inside the Basic Info section as part of the same grouped card. In the live app, Languages is a separate card below Basic Info. This creates extra visual separation between fields that belong together.

- **(MEDIUM) Teaching Goals and Key Difficulties not shown side by side.** Stitch renders Teaching Goals (left) and Key Difficulties (right) as a two-column pair at the same vertical level. Live renders them sequentially in a single full-width column inside one card. The side-by-side layout is more scannable for a teacher who wants to see goals and difficulties at a glance.

- **(MEDIUM) Notes section label mismatch.** Stitch labels these "Sensitivities / Life Context" and "Pedagogical Observations." Live uses "Personal notes" and "Teaching notes." The Stitch labels are more specific and pedagogically meaningful. The live labels are generic.

- **(MEDIUM) Header missing Cancel button -- no escape from edit mode.** Stitch header: back arrow + "Edit Student" title + Cancel (ghost) + Save Profile (primary). Live header: back arrow + "Edit Student" title + "Create Course" (outline). There is no Cancel. The back link and Done button both navigate away, but neither is labeled "Cancel." A teacher who accidentally opens Edit Student has no obvious escape that feels like "undo."

- **(LOW) "Create Course" in the header is a wrong-context action.** Stitch shows Cancel + Save Profile. Live substitutes "Create Course," which is creating a new resource while editing an existing one. It's useful functionality but feels misplaced here. If kept, it should be at the bottom near Courses, not in the page header.

### Interaction issues

- **(MEDIUM) CEFR badge has very subtle hover affordance.** The badge button has `cursor-pointer hover:opacity-80`, so technically there IS a cursor change. But the opacity shift is very slight and not enough to signal "this is editable" to a teacher who hasn't discovered it. Stitch implies the badge is clickable, but a new teacher would try clicking the label, not the badge. Fix: add a small pencil icon that appears on hover over the badge, matching the pattern used on the Motivation banner. Fitts' law -- the target is also quite small (~28px wide).

- **(MEDIUM) No auto-focus on new Objective row.** Clicking "+ Add Objective" creates a new row correctly, but the text input in that row is not auto-focused. The teacher has to click into the input manually after adding. Simple fix: `useEffect` or a ref to focus the new input when the row mounts.

- **(MEDIUM) Difficulty description field truncates long text.** The description field is a plain `<Input>` with no height expansion. Nataliya's existing difficulty ("tenía un poco de dificultades cuándo usar 1 y cuándo usar otro") is truncated at the input edge. The teacher has no way to read or edit the full text without manually selecting all. Fix: replace with `<Textarea rows={1}` with `resize-none` and `overflow-hidden`, auto-expanding on input (or just use a wider input with `min-w-0 flex-1` that doesn't clip). This finding was already listed HIGH in section 7; confirmed it affects the Edit screen too.

- **(LOW) Objective row uses off-palette orange.** The objective row has `border-l-4 border-orange-300` and `bg-orange-50/30`. Orange is not in the Academic Atelier palette (primary: indigo, secondary: zinc, tertiary: #7E3000 warm brown, amber for warnings). Use `border-tertiary` (#7E3000) for the left accent or `border-amber-400` at most. The `bg-orange-50` background tint should become `bg-[#FFF8F0]` (tertiary-fixed) or a light amber to stay in the palette.

- **(LOW) Date input on objective row has a visible border.** The native `<input type="date">` uses `border border-zinc-200` -- a 1px solid border. Violates the no-line rule. Use the ghost border fallback: `outline outline-1 outline-[#C7C4D8]/20`. Also: the row contains two calendar indicators (a Lucide `<Calendar>` icon to the left AND the browser's native date picker icon inside the input). Remove the Lucide icon -- the native date picker already has a calendar affordance.

### Seed data confirmed (Edit Student view)

| Issue | Field | Severity |
|-------|-------|----------|
| "dsadasd" chip visible in Interests | Interests | CRITICAL |
| "to fly" in Reason for Studying | Background | HIGH |
| "travel to sapin" in Learning Goals | Teaching Goals | LOW |
| "14" without unit in Hourly Rate | Commercial | HIGH |
| Native Languages empty (Nataliya) | Languages | HIGH |
| "spanish" chip lowercase in Spoken Languages | Languages | HIGH |
| All Personal Background fields empty (Birth Year, Profession, Origin, Residence) | Background | MEDIUM |

Note: "spanish" (lowercase) in Spoken Languages is a data normalization bug -- the seed stores the value without proper casing. All language values should be stored and displayed with proper capitalization.

### Visual / design issues

- **(MEDIUM) Skill Overrides card position creates visual imbalance.** The Skill Overrides card is placed in the right column of a 2-column grid where the left column is intentionally empty. This creates a floating card on the right with a large empty white area to its left. It matches the Stitch intent (skills overrides as a sidebar element), but without the photo above it (which Stitch has), the right column looks sparse and unanchored from the top of the screen. If the photo isn't implemented, consider moving Skill Overrides into the Basic Info card as a subsection.

- **(LOW) Official Level field shows a bordered native Select when empty.** When `officialCefrLevel` is not set, the field renders a Radix `<SelectTrigger>` with a "None" placeholder. The trigger has a default border that subtly violates the no-line rule. When a value IS set, it switches to a badge (correct). Consider also defaulting to the badge pattern for the empty state -- a ghost/dashed badge that says "Not set" would be cleaner.

### Navigation bugs (confirmed via live testing + JS)

- **(HIGH) "Notes" and "Commercial" nav links land on Difficulties instead.** Root cause: both sections start past the max scrollable position. `section-notes` starts at 2405px, `section-commercial` at 2611px, but `maxScroll = scrollHeight (3173) - clientHeight (1076) = 2097px`. Clicking either nav item calls `scrollTo(2345)` or `scrollTo(2551)` -- both are clamped to 2097. At that scroll position the scrollspy detects "Difficulties" as active (the last section whose header has crossed the 80px offset). The teacher clicks "Notes" and lands visually on the Notes section but the nav highlights "Difficulties" -- and vice versa for Commercial. Fix: add ~600px bottom padding to the form container so Notes and Commercial can scroll to the 80px threshold. Or: change the scrollspy edge-case logic -- when `scrollTop >= maxScroll - 10`, activate the last visible section instead of applying the offset rule.

- **(HIGH) Sidebar clips under the section nav when scrolled.** The sidebar uses `lg:sticky lg:top-6` (top: 24px). The section nav sticks at `top: 0` and is 49px tall (bottom at 73px). So when both are sticky simultaneously, the top 49px of the sidebar is hidden under the nav bar. In practice: the "TEACHING TODOS" section header is clipped and partially invisible. Fix: change `lg:top-6` to `lg:top-[76px]` (or `lg:top-20`) to clear the nav bar. At mobile, the nav sticks at `top-14` (56px) and nav height is still ~49px, so mobile needs `top-[108px]` or similar -- or just set a CSS var for nav height and reference it.

### Summary additions

| Priority | Item | Screen |
|----------|------|--------|
| HIGH | "Notes" and "Commercial" nav links land on Difficulties (max-scroll clamp bug) | Edit Student |
| HIGH | Sidebar clips under section nav (top-6 doesn't clear 49px nav height, needs top-[76px]) | Edit Student |
| CRITICAL | "dsadasd" in Interests (confirmed live in Edit view) | Edit Student |
| HIGH | "spanish" chip lowercase in Spoken Languages -- data normalization bug | Edit Student |
| HIGH | Native Languages empty for Nataliya -- seed gap | Edit Student |
| HIGH | "14" hourly rate without unit (confirmed in Edit view) | Edit Student |
| MEDIUM | Missing photo/avatar upload vs Stitch | Edit Student |
| MEDIUM | Languages card separate from Basic Info -- Stitch gap | Edit Student |
| MEDIUM | Teaching Goals and Key Difficulties not side by side -- Stitch gap | Edit Student |
| MEDIUM | No Cancel button in header -- no clear escape from edit mode | Edit Student |
| MEDIUM | CEFR badge hover affordance too subtle -- no pencil icon | Edit Student |
| MEDIUM | No auto-focus on new Objective row when added | Edit Student |
| MEDIUM | Difficulty description truncated in input field (also affects Edit view) | Edit Student |
| MEDIUM | All Personal Background fields empty for Nataliya -- seed gap | Edit Student |
| MEDIUM | Notes section labels differ from Stitch ("Personal notes" vs "Sensitivities / Life Context") | Edit Student |
| MEDIUM | Skill Overrides card visually unanchored (no photo above it) | Edit Student |
| LOW | "Create Course" in page header -- misplaced context action | Edit Student |
| LOW | Objective row uses off-palette orange (border-l-4 border-orange-300) | Edit Student |
| LOW | Date input on objective row has visible border + redundant calendar icon | Edit Student |
| LOW | Official Level shows bordered Select in empty state | Edit Student |

---

## 12. Log Session / Edit Session Screen -- 2026-04-17 (Vera live review, Chrome + code)

### What works well

- **Two-panel layout is the right call.** Left panel = student context (objectives, followups, last session, difficulties), right panel = the form. The teacher doesn't have to hold context in their head or switch tabs. This is the strongest interaction design in the app.
- **Topic tag suggestions from narrative text work beautifully.** Typing "preterite vs imperfect" immediately surfaces "+ preterite" and "+ imperfect" as clickable suggestion chips. This is exactly the kind of progressive intelligence that reduces friction without being intrusive. The teacher types naturally and gets structured data for free.
- **Autosave model is correct.** Field changes trigger debounced saves, Done flushes and navigates. No explicit Save button. Matches the UX standard in section 9.
- **Followup checkbox with strikethrough is clear.** Checking "Prepare a mock exam" in the left panel immediately crosses it out. The visual feedback is unambiguous: this item will be marked done when I click Done.
- **Teaching Todos quick-add works well.** Enter adds the item, it appears immediately with an X to remove, input clears for the next item. Consistent with the add-immediately pattern.
- **Cancelled state correctly hides irrelevant fields.** Toggling Cancelled strips the form down to Topics Covered, Notes, and Level Reassessment. The italic explanation text is helpful.
- **Progressive disclosure for secondary sections.** Voice Note, Today's Context, and Level Reassessment are behind "Show extra sections." This keeps the primary flow clean for the 90% case where teachers just log what happened and assign homework.
- **Previous Homework Status uses chip buttons (Done/Partial/Not Done) instead of a dropdown.** Three options, one click, indigo fill on selection. Fitts' law approved. Much faster than a dropdown for a 3-option choice.
- **Planned for Today reference bar.** When the previous session had a "Next Session Plan," it shows as a subtle indigo reference bar above the narrative textarea. The teacher sees what they planned without switching tabs.
- **Left panel sections are conditionally rendered.** Short-term Objectives, Teaching Todos, Pending Followups, Planned for Today only appear when there's data. No empty state noise. Clean.

### Visual / layout issues

- **(MEDIUM) No page heading in edit mode for orientation.** In create mode, "What Happened?" is a strong editorial headline that tells the teacher what this screen is for. In edit mode, the heading changes to "Edit Session," which is correct but loses the warmth. More importantly, in both modes the heading competes with no other visual hierarchy element. The metadata bar (Date/Duration/Cancelled) and the heading occupy the same importance level visually, but they serve different purposes. Consider: make the heading Manrope display-lg in create mode (this is a "moment" screen, the teacher just finished a class), and Title-SM in edit mode (this is a correction task, not a moment).

- **(MEDIUM) Left panel "Last Session" card shows only the date, no content.** The Last Session (#12) card for Nataliya shows "17 May 2026" and nothing else. No narrative preview, no homework assigned. The code conditionally renders `prevSession.actualContent` and `prevSession.homeworkAssigned`, but Session #12 (the most recent May 17 one) has no actualContent. The card becomes a near-empty white box that takes vertical space without delivering value. Fix: when the session has no content, show a muted "No notes recorded" message, or skip the Last Session card entirely and show the next session that has content.

- **(MEDIUM) Left panel has no scroll indicator.** When there are many objectives, todos, followups, and difficulties, the left panel scrolls independently (`overflow-y-auto`). But there's no visual cue that content exists below the fold. A subtle scroll shadow at the bottom edge (like the Edit Student section nav) would signal "more below." A teacher with 5 pending followups might not realize there are also active difficulties further down.

- **(LOW) Metadata bar date input has visible border.** The `<Input type="date">` inside the tonal bar uses default Input styling which includes a border. This subtly violates the no-line rule. Inside a `#F4F2FD` tonal bar, the white input with a border creates an unnecessary line. Use the ghost border fallback (`outline-[#C7C4D8]/20`) or remove the border entirely since the white fill against lavender already defines the boundary.

- **(LOW) Duration dropdown trigger has visible border.** Same issue as the date input. The `SelectTrigger` inside the metadata bar has a default border. Remove it; the tonal contrast is sufficient.

- **(LOW) NEW TEACHING TODOS and NEW FOLLOWUPS card headers are in bold colored text (indigo and amber).** The uppercase + bold + color creates a loud visual element at the bottom of the form. These are secondary actions, not primary. Consider: use the same `label-sm` treatment as other section headers (zinc-400, not colored) or reduce to regular weight. The card background tint already signals the category (indigo vs amber). The text doesn't need to shout too.

### Interaction issues

- **(HIGH) Autosave status indicator is invisible.** After typing in the narrative textarea, no "Saving..." or "All changes saved" indicator appeared between the back arrow and Done button. The code renders `saveStatus` states (saving, saved, retrying, error) in a `<span>` with `text-xs`, but after typing and waiting 3+ seconds, nothing was visible. Either: (a) the autosave debounce hasn't fired yet, (b) the status resets to idle too quickly, or (c) the text is there but invisible against the white background. A teacher who types a long narrative and sees no save confirmation will not trust the autosave. Per UX standard section 9, Rule 3: "Always show a 'Saved' flash after autosave." This is the most important interaction signal on this screen. Fix: verify the debounce timing, ensure the "All changes saved" text persists for at least 2 seconds after save completes, and consider a more visible indicator (a small green dot or checkmark icon next to "Done" would be scannable).

- **(HIGH) Back arrow triggers handleDone, not browser back.** The back arrow (`<ArrowLeft>`) calls `handleDone()`, which flushes saves, processes checked todos/followups, and navigates to the student detail. This is NOT a back button. If the teacher accidentally opened Log Session and wants to leave without logging anything, clicking the arrow will still create a session if any autosave has fired. There is no "discard and go back" path. The Stitch convention (and the Edit Student screen) treats the back arrow as navigation, not as a save trigger. Fix: (a) separate the back arrow from handleDone. Back arrow should navigate away. If there are unsaved changes, show a brief "Discard changes?" confirmation. (b) Keep Done as the explicit commit action.

- **(MEDIUM) Difficulty checkbox text is truncated.** The Active Difficulties section shows "tenia un poco de dificultades cuando usar 1 y cuando usar otro" truncated at the left panel width. The full text matters for the teacher to decide whether to check it. The checkbox label uses `text-sm leading-snug` with no wrapping constraints, but the panel width (35%) clips it. This is the same truncation issue flagged in sections 7 and 11 for the Difficulties field. Fix: allow the text to wrap to multiple lines within the checkbox label.

- **(MEDIUM) No keyboard shortcut for Done.** A teacher logging sessions between classes wants to: type narrative, check a followup, press Ctrl+Enter to save and go back. Currently the only path is mouse-click on the Done button. The textarea captures Enter for newlines (correct), so Ctrl+Enter or Cmd+Enter is the natural shortcut for "I'm done." Add a `onKeyDown` handler on the form/page level for Ctrl+Enter -> handleDone.

- **(MEDIUM) Topic tag suggestions don't auto-dismiss after clicking.** I clicked the "+ preterite" suggestion chip but the suggestion row persisted with both chips still showing. The click may have missed the chip (small target ~70px wide), but even so, the suggestion chips should have generous click targets. Fitts' law: these are precision targets at ~12px height inside a row that sits between the textarea and the tag input, a high-traffic visual zone. Fix: make the suggestion chips at least `py-1` (currently `py-0.5`) and ensure the click handler removes the clicked suggestion from the list immediately.

- **(MEDIUM) No confirmation or undo when checking existing Followups/Todos.** Checking "Prepare a mock exam" in the Pending Followups section marks it for completion on Done. But the teacher gets no warning that this is a batch operation. If they check 3 followups and 2 todos, then click Done, all 5 are processed in one shot with no ability to undo. The inline text "Checked items will be marked as covered on Done" appears for Teaching Todos but NOT for Pending Followups. Add the same hint text below the Followups section when items are checked.

- **(LOW) "Show extra sections" toggle text is generic.** A teacher who hasn't used this screen before doesn't know what "extra sections" means. Consider: "Voice note, context & more" or just list the section names. Discoverability suffers when the toggle label is vague.

### Stitch gaps

- **(MEDIUM) No session time field.** Already flagged HIGH in section 1 (Dashboard review): sessions default to 00:00 because there's no time picker. The metadata bar has Date and Duration but no Time. When the hero card countdown on the dashboard depends on session time, every session showing midnight is a cascading display bug. The Log Session form is where the fix lives: add a time input next to Date in the metadata bar.

- **(MEDIUM) Left panel has no "Pedagogical Profile" summary.** The left panel shows Objectives, Todos, Followups, Last Session, Planned for Today, and Difficulties. It does NOT show the student's skill levels or learning goals. A teacher logging a session might want to glance at "Reading A1, Writing B1, Speaking B1, Listening B2" to decide if today's session should focus on the weak skill. Adding a compact skill bar summary (the same component from the Overview's Pedagogical Profile card, in miniature) would make the left panel a complete pre-class and during-class reference.

- **(LOW) Left panel doesn't show Teacher's Working Memory.** The TWM section ("Nataliya's father just returned from Ukraine, she was emotional") is arguably the most important context for the active session. The teacher is IN the class, logging as they go or right after. The left panel should surface TWM notes so the teacher can reference affective context without leaving the form. Currently TWM is only visible on Overview (after "Show all sections" toggle) and the Profile tab.

### Information architecture

- **(MEDIUM) "New Teaching Todos" and "New Followups" cards are placed below all form fields, at the bottom.** The teacher's natural flow is: (1) write what happened, (2) note homework, (3) plan next session, (4) add any new todos or followups that came up. Steps 1-3 are in order. But step 4 (todos/followups) is below step 3 (Next Session Plan), which is correct for the flow BUT is also below the "Show extra sections" toggle. This means a teacher who wants to add a todo after writing the narrative has to scroll past Next Session Plan to find the cards. If "Show extra sections" is open, the todos are pushed even further down. Consider: move the New Teaching Todos and New Followups cards above the "Show extra sections" toggle. They're primary workflow items, not "extra."

- **(LOW) Followups checked in left panel vs followups added in right panel are visually disconnected.** Checking "Prepare a mock exam" in the left panel (existing followup, marking done) and typing "Send exam practice PDF" in the right panel's NEW FOLLOWUPS card (creating a new followup) are related actions but happen in different panels with different visual treatments. The teacher might not realize that checked items in the left panel are also processed on Done. Consider: after checking a followup in the left panel, show a brief "(will be marked done)" label below the checked item.

### User-reported issues (2026-04-17)

- **(HIGH) Done/Back navigates to Overview tab instead of Sessions tab.** `handleDone` at line 359 calls `navigate(`/students/${id}`)`, which lands on the default Overview tab. When a teacher edits a session from the Sessions tab (kebab > Edit), clicking Done should return them to the Sessions tab (`/students/${id}?tab=sessions`). The teacher's mental model is "I was looking at session history, I edited one, I should land back on session history." Landing on Overview is disorienting. Fix: pass `?tab=sessions` in the navigate call when in edit mode, or always navigate back to wherever the user came from (using a `returnTo` search param or `navigate(-1)` when no side effects need flushing).

- **(HIGH) Voice recording is hidden behind "Show extra sections" in edit mode.** The AudioRecorder component is inside the `secondaryOpen` conditional block (line 969-987). A teacher who wants to dictate session notes via voice has to know to click "Show extra sections" first. Voice recording is a primary input method, not a secondary feature. Fix: move the Voice Note bar out of the secondary sections and place it as a compact bar directly below the narrative textarea (or inline with the textarea as a microphone icon button). In edit mode this is especially important since the teacher may want to add voice context to an existing session.

- **(HIGH) Session creation metadata is lost in the UI.** Sessions store `CreatedAt` and `UpdatedAt` in the backend, but neither is displayed anywhere in the frontend. When a teacher creates a session via autosave, there's no visible record of when the log was originally created or last modified. This matters for: (a) distinguishing sessions logged live during class vs. sessions logged days later from memory, (b) audit trail when reviewing session history, (c) detecting stale/abandoned draft sessions created by accidental autosave. Fix: show "Created [date]" and "Last edited [date]" in small muted text somewhere on the session detail, either in the expanded row on the Sessions tab or in the metadata bar when editing.

### Summary additions

| Priority | Item | Screen |
|----------|------|--------|
| HIGH | Autosave status indicator invisible after typing (no "Saved" feedback) | Log Session |
| HIGH | Back arrow triggers handleDone instead of navigation (no discard path) | Log Session |
| HIGH | Done/Back navigates to Overview tab instead of Sessions tab | Log Session |
| HIGH | Voice recording hidden behind "Show extra sections" toggle | Log Session |
| HIGH | Session creation/modification timestamps not shown in UI | Log Session |
| MEDIUM | Left panel "Last Session" card shows only date when session has no content | Log Session |
| MEDIUM | Left panel has no scroll indicator (content below fold not signaled) | Log Session |
| MEDIUM | Difficulty checkbox text truncated at panel width | Log Session |
| MEDIUM | No Ctrl+Enter keyboard shortcut for Done | Log Session |
| MEDIUM | Topic tag suggestion chips too small, click easily missed | Log Session |
| MEDIUM | No hint text for checked Followups (only shown for Todos) | Log Session |
| MEDIUM | No session time field in metadata bar | Log Session |
| MEDIUM | Left panel missing skill level summary | Log Session |
| MEDIUM | New Todos/Followups cards below "Show extra sections" toggle | Log Session |
| LOW | Date input and Duration dropdown have visible borders in metadata bar | Log Session |
| LOW | NEW TEACHING TODOS / NEW FOLLOWUPS headers too loud (bold colored text) | Log Session |
| LOW | "Show extra sections" toggle text is generic | Log Session |
| LOW | Left panel doesn't show Teacher's Working Memory | Log Session |
| LOW | Checked followups in left panel lack "(will be marked done)" label | Log Session |
