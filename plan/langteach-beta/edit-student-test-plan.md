# Edit Student / Add Student: Exhaustive Test Plan

**Screens:** `/students/:id/edit` (edit) and `/students/new` (create)
**Component:** `StudentForm.tsx` (shared for both routes)
**Reference docs:** `docs/design-system.md` (sections 5, 8, 11), `docs/student-profile-field-guide.md`, `students.ts` API types

---

## How to run this plan

This plan is split into two sequential passes. Run them in order in the same session.

**Pass 1 (Chrome+Claude):** Use the Chrome extension to navigate the live app. Verify appearance and interactions visually. Report findings as a table: `| # | Result | Notes |` where Result is PASS / FAIL / SKIP (with reason).

**Pass 2 (Playwright):** Run the e2e suite. For Function rows not yet covered by an existing test, write a new Playwright test, run it, and report the result. Report findings in the same format.

After both passes, produce a single consolidated findings table.

**Test students:**
- **Ana Visual** (B2, full profile: todos, followups, difficulties, objectives, background, notes, skill overrides): rich data across all sections
- **Clara Seed** (A1, minimal data): empty states, first-time scenarios
- **Marco Visual** (A2, sparse data): partial profile, some fields empty
- **(New student)**: create mode validation and flow

---

## Pass 1: Chrome + Claude

*All Display and Interaction layer tests. Navigate the live app, verify visually.*

### 1. Navigation and Loading

#### 1.1 Entry points
| # | Test | Student | Steps |
|---|------|---------|-------|
| 1.1.1 | Navigate from Student Detail "Edit" button | Ana Visual | Click "Edit Student" on detail page. Verify URL is `/students/:id/edit`. |
| 1.1.2 | Navigate from Student List pencil icon | Ana Visual | Click edit action on student row. Verify correct student loads. |
| 1.1.3 | Navigate to Add Student | -- | Click "Add Student" from students list. Verify URL is `/students/new`. |
| 1.1.4 | Direct URL with invalid student ID | -- | Navigate to `/students/nonexistent/edit`. Verify styled error with "Student not found." and "Go back" link. |

#### 1.2 Loading states
| # | Test | Student | Steps |
|---|------|---------|-------|
| 1.2.1 | Skeleton while loading (edit mode) | Ana Visual | Navigate to edit page. Verify skeleton placeholders appear before data loads. |
| 1.2.2 | Form and sidebar render after load | Ana Visual | Verify form (left) and sidebar (right) both visible on desktop. |
| 1.2.3 | No skeleton in create mode | -- | Navigate to `/students/new`. Verify empty form renders immediately (no skeleton). |

### 2. Page Header

#### 2.1 Header content
| # | Test | Mode | Steps |
|---|------|------|-------|
| 2.1.1 | Edit mode: title "Edit Student" | Ana Visual | Verify page title is "Edit Student". |
| 2.1.2 | Edit mode: subtitle | Ana Visual | Verify subtitle "Update this student's profile." |
| 2.1.3 | Edit mode: back link to student detail | Ana Visual | Verify back arrow links to `/students/:id`. Back label shows student name. |
| 2.1.4 | Create mode: title "Add Student" | -- | Verify page title is "Add Student". |
| 2.1.5 | Create mode: subtitle | -- | Verify subtitle "Create a new student profile." |
| 2.1.6 | Create mode: back link to students list | -- | Verify back arrow links to `/students`. |
| 2.1.7 | Create mode: Save + Cancel buttons | -- | Verify "Save Student" (primary) and "Cancel" (outline) buttons. |
| 2.1.8 | Edit mode: Create Course button | Ana Visual | Verify "Create Course" button is present and clickable. |
| 2.1.9 | Create Course disabled without language/CEFR | -- | In create mode (or edit with empty language), verify button disabled with tooltip. |
| 2.1.10 | Create Course navigates correctly | Ana Visual | Click "Create Course". Verify URL includes `?studentId=`. |

#### 2.2 Inactive badge
| # | Test | Student | Steps |
|---|------|---------|-------|
| 2.2.1 | Inactive badge shown when isActive=false | -- | Toggle isActive off. Verify "Inactive" badge appears below header. |
| 2.2.2 | Badge absent when isActive=true | Ana Visual | Verify no "Inactive" badge. |

### 3. Section Navigation (Edit Mode Only)

| # | Test | Student | Steps |
|---|------|---------|-------|
| 3.1 | Section nav visible in edit mode | Ana Visual | Verify sticky section nav with 7 pills: Basic Info, Proficiency, Background, Teaching Goals, Difficulties, Notes, Commercial. |
| 3.2 | Section nav absent in create mode | -- | Verify no section nav in `/students/new`. |
| 3.3 | Clicking a section pill scrolls | Ana Visual | Click "Notes" pill. Verify page scrolls to Notes section. |
| 3.4 | Active section highlights on scroll | Ana Visual | Scroll to Difficulties section. Verify "Difficulties" pill has indigo-50 bg + indigo-700 text. |
| 3.5 | Horizontal scroll for overflow | Ana Visual | Narrow the browser. Verify pills scroll horizontally without line wrapping. |

### 4. Basic Info Card

#### 4.1 Name field
| # | Test | Mode | Steps |
|---|------|------|-------|
| 4.1.1 | Label, required marker, tooltip | Ana Visual | Verify "Name *" label with `FieldTooltip`. |
| 4.1.2 | Pre-populated in edit mode | Ana Visual | Verify name shows "Ana Visual". |
| 4.1.3 | Placeholder in create mode | -- | Verify placeholder "e.g. Ana Garcia". |
| 4.1.4 | Max length 200 chars | Ana Visual | Verify `maxLength` prevents typing beyond 200. |
| 4.1.5 | Inline validation: required | Ana Visual | Clear the name field, click elsewhere. Verify "Name is required" error. |
| 4.1.6 | Autosave triggers on typing | Ana Visual | Change name. Verify `scheduleTextSave` fires (debounced). |

#### 4.2 Learning Language (MultiSelect, single)
| # | Test | Mode | Steps |
|---|------|------|-------|
| 4.2.1 | Pre-populated in edit mode | Ana Visual | Verify "English" chip shown. |
| 4.2.2 | Only one language selectable | -- | Try selecting a second language. Verify max 1 enforced. |
| 4.2.3 | Custom language allowed | -- | Type a custom language and select it. Verify chip appears. |
| 4.2.4 | Required validation | Ana Visual | Remove language. Verify "Language is required" error. |
| 4.2.5 | Duplicate warning | Ana Visual | Try adding "English" again. Verify "Already selected" message. |
| 4.2.6 | Immediate save on change | Ana Visual | Change language. Verify `saveNow` fires (not debounced). |

#### 4.3 Teacher's Assessment (CEFR badge + select)
| # | Test | Mode | Steps |
|---|------|------|-------|
| 4.3.1 | Badge display when set | Ana Visual | Verify CefrBadge shows "B2" (not a select dropdown). |
| 4.3.2 | Pencil icon on hover | Ana Visual | Hover over badge. Verify pencil edit icon appears. |
| 4.3.3 | Click badge opens select | Ana Visual | Click badge. Verify CEFR dropdown opens with A1-C2 options. |
| 4.3.4 | Select a level closes dropdown | Ana Visual | Select "B1". Verify badge updates and dropdown closes. |
| 4.3.5 | Required marker present | -- | Verify "Teacher's Assessment *" label. |
| 4.3.6 | Immediate save on change | Ana Visual | Change level. Verify `saveNow` fires. |

#### 4.4 Official Level (CEFR badge + "Not set")
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.4.1 | "Not set" dashed button when empty | Clara Seed | Verify dashed-border "Not set" button. |
| 4.4.2 | Badge display when set | Ana Visual | If set, verify CefrBadge rendered (not "Not set"). |
| 4.4.3 | Click "Not set" opens select | Clara Seed | Click "Not set". Verify dropdown with "None" + A1-C2. |
| 4.4.4 | Select "None" clears the value | Ana Visual | Open select, choose "None". Verify reverts to "Not set". |
| 4.4.5 | Helper text | -- | Verify "Official exam result or external assessment." text below. |

#### 4.5 Native Languages (MultiSelect, multi)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.5.1 | Pre-populated in edit mode | Ana Visual | Verify native language chip(s) shown. |
| 4.5.2 | Multiple selections allowed | -- | Add a second language. Verify both chips present. |
| 4.5.3 | Custom language allowed | -- | Type "Catalan" (not in list). Verify it can be added. |
| 4.5.4 | Duplicate warning | Ana Visual | Try adding existing native language. Verify "Already added". |
| 4.5.5 | Immediate save on change | Ana Visual | Add a language. Verify `saveNow` fires. |

#### 4.6 Spoken Languages (MultiSelect, multi)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 4.6.1 | Helper text below | -- | Verify "Other languages spoken. Flat list, no proficiency level." |
| 4.6.2 | Pre-populated in edit mode | Ana Visual | Verify spoken language chips. |
| 4.6.3 | Duplicate warning | Ana Visual | Try adding existing. Verify "Already added" message appears. |

### 5. Proficiency Section (Skill Overrides)

| # | Test | Student | Steps |
|---|------|---------|-------|
| 5.1 | Card title and tooltip | Ana Visual | Verify "Skill Overrides" with FieldTooltip. |
| 5.2 | Helper text | -- | Verify "Override the general CEFR level per skill..." text. |
| 5.3 | 2x2 grid layout | Ana Visual | Verify Reading, Writing, Speaking, Listening in 2-column grid. |
| 5.4 | Pre-populated values | Ana Visual | Verify overrides display (e.g. "Reading B2", "Writing A2", "Speaking B1", "Listening B1"). |
| 5.5 | Unset skill shows "--" | Clara Seed | Verify skills without overrides show "Reading --". |
| 5.6 | Click opens hidden select | Ana Visual | Click a skill tile. Verify CEFR dropdown appears. |
| 5.7 | Select "--" clears override | Ana Visual | Open dropdown, select "--". Verify tile reverts to "--". |
| 5.8 | Color matches CEFR level | Ana Visual | Verify B-level overrides use `primary-fixed` colors, A-level use `secondary-container`. |
| 5.9 | Immediate save on change | Ana Visual | Change a skill level. Verify `saveNow` fires. |
| 5.10 | **LAYOUT CHECK** Section positioned in right column | Ana Visual | Verify Skill Overrides card appears on the right side (below Basic Info card on desktop). |

### 6. Personal Background Section

#### 6.1 Birth Year + Profession row
| # | Test | Student | Steps |
|---|------|---------|-------|
| 6.1.1 | Two-column layout | -- | Verify Birth Year and Profession side by side. |
| 6.1.2 | Birth Year pre-populated | Ana Visual | Verify "1992" shown. |
| 6.1.3 | Birth Year placeholder | Clara Seed | Verify placeholder "e.g. 1990". |
| 6.1.4 | Birth Year type=number | -- | Verify only numeric input accepted. |
| 6.1.5 | Birth Year min/max | -- | Verify min=1900, max=current year. |
| 6.1.6 | Profession pre-populated | Ana Visual | Verify "Marketing Manager". |
| 6.1.7 | Profession max length 128 | -- | Verify maxLength enforced. |

#### 6.2 Origin (Country + City)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 6.2.1 | Sub-label "Origin" | -- | Verify "Origin" text label above row. |
| 6.2.2 | Country pre-populated | Ana Visual | Verify "Brazil". |
| 6.2.3 | City pre-populated | Ana Visual | Verify "Sao Paulo". |
| 6.2.4 | Max length 64 each | -- | Verify maxLength on both fields. |

#### 6.3 Residence (Country + City)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 6.3.1 | Sub-label "Residence" | -- | Verify "Residence" text label above row. |
| 6.3.2 | Country pre-populated | Ana Visual | Verify "Spain". |
| 6.3.3 | City pre-populated | Ana Visual | Verify "Barcelona". |

#### 6.4 All Background text fields autosave
| # | Test | Student | Steps |
|---|------|---------|-------|
| 6.4.1 | Text changes trigger debounced save | Ana Visual | Change profession. Verify `scheduleTextSave` fires. |

### 7. Reason for Studying Card

| # | Test | Student | Steps |
|---|------|---------|-------|
| 7.1 | Card title | -- | Verify "Reason for Studying" card header. |
| 7.2 | Decorative quotation mark | Ana Visual | Verify large indigo opening quote character (typography flourish). |
| 7.3 | Textarea with italic styling | Ana Visual | Verify textarea has italic text. |
| 7.4 | Pre-populated | Ana Visual | Verify text matches seeded reason. |
| 7.5 | Placeholder | Clara Seed | Verify placeholder "e.g. Moving to Spain next year, loves the culture..." |
| 7.6 | Max length 512 | -- | Verify maxLength enforced. |
| 7.7 | Debounced autosave | Ana Visual | Type in textarea. Verify `scheduleTextSave` fires. |

### 8. Interests Card

| # | Test | Student | Steps |
|---|------|---------|-------|
| 8.1 | Card title and tooltip | -- | Verify "Interests" with FieldTooltip. |
| 8.2 | Pre-populated chips | Ana Visual | Verify interest chips (e.g. "literature", "travel", "photography"). |
| 8.3 | Chip style: indigo-50 bg, indigo-700 text, rounded-full | Ana Visual | Verify chip visual matches design system. |
| 8.4 | Add via Enter key | Ana Visual | Type "yoga", press Enter. Verify new chip appears. |
| 8.5 | Add via comma key | Ana Visual | Type "cooking,". Verify chip added on comma. |
| 8.6 | Remove via X button | Ana Visual | Click X on a chip. Verify removal. |
| 8.7 | Backspace removes last chip | Ana Visual | Focus input (empty), press Backspace. Verify last chip removed. |
| 8.8 | Add on blur | Ana Visual | Type "hiking", click outside. Verify chip added. |
| 8.9 | Duplicate not added | Ana Visual | Type an existing interest. Verify no duplicate chip. |
| 8.10 | Placeholder when empty | Clara Seed | Verify placeholder "Type and press Enter". |
| 8.11 | Helper text | -- | Verify "Press Enter or comma to add. Backspace to remove last." |
| 8.12 | Immediate save on add/remove | Ana Visual | Add or remove a chip. Verify `saveNow` fires. |
| 8.13 | Container click focuses input | Ana Visual | Click the chip container area (not on a chip). Verify input gets focus. |

### 9. Teaching Goals Section

#### 9.1 Learning Goals (Tree Editor)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 9.1.1 | Section label and tooltip | -- | Verify "Learning Goals" with FieldTooltip. |
| 9.1.2 | Pre-populated goals | Ana Visual | Verify goals listed (e.g. "Improve conversational fluency"). |
| 9.1.3 | Add a goal | Ana Visual | Use tree editor to add a goal. Verify it appears in the list. |
| 9.1.4 | Remove a goal | Ana Visual | Remove a goal. Verify removal. |
| 9.1.5 | Immediate save on change | Ana Visual | Add or remove. Verify `saveNow` fires. |
| 9.1.6 | Empty state | Clara Seed | Verify empty tree state. |

#### 9.2 Short-Term Objectives
| # | Test | Student | Steps |
|---|------|---------|-------|
| 9.2.1 | Section label and helper text | -- | Verify "Short-Term Objectives" + "Specific goals with optional target dates (max 10)." |
| 9.2.2 | "Add Objective" button | -- | Verify outline button with Plus icon. |
| 9.2.3 | Pre-populated objectives | Ana Visual | Verify objectives rendered (e.g. "Pass B2 Cambridge exam" with date). |
| 9.2.4 | Objective row layout | Ana Visual | Verify text input + date picker + trash icon per row. |
| 9.2.5 | Amber left border | Ana Visual | Verify `border-l-4 border-amber-400` on each row. |
| 9.2.6 | "NEAR DATE" warning | Ana Visual | If a target date is < 3 days away, verify orange "NEAR DATE" badge. |
| 9.2.7 | Add objective focuses input | Ana Visual | Click "Add Objective". Verify new row appears and input is focused. |
| 9.2.8 | Remove objective | Ana Visual | Click trash icon. Verify row removed. |
| 9.2.9 | Max 10 enforced | -- | Add objectives until 10 exist. Verify "Add Objective" button becomes disabled. |
| 9.2.10 | Empty state | Clara Seed | Verify "No short-term objectives added yet." italic text. |
| 9.2.11 | Text change: debounced save | Ana Visual | Edit objective text. Verify `scheduleTextSave`. |
| 9.2.12 | Date change: debounced save | Ana Visual | Change target date. Verify `scheduleTextSave`. |
| 9.2.13 | Remove: immediate save | Ana Visual | Remove an objective. Verify `saveNow`. |

### 10. Difficulties Section

#### 10.1 Weaknesses (Areas to Improve)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 10.1.1 | Section label and tooltip | -- | Verify "Areas to Improve" with FieldTooltip and helper text. |
| 10.1.2 | "Add" button | -- | Verify outline button. |
| 10.1.3 | Weakness row layout | Ana Visual | Verify description input + type dropdown + trash icon. |
| 10.1.4 | Type dropdown options | -- | Verify: Grammatical, Lexical, Orthographic. |
| 10.1.5 | Add a weakness | -- | Click "Add". Verify new row appears with default type "grammatical". |
| 10.1.6 | Remove a weakness | Ana Visual | Click trash. Verify row removed. |
| 10.1.7 | Description change: debounced save | Ana Visual | Edit description. Verify `scheduleTextSave`. |
| 10.1.8 | Type change: debounced save | Ana Visual | Change dropdown. Verify `scheduleTextSave`. |
| 10.1.9 | Remove: immediate save | Ana Visual | Remove row. Verify `saveNow`. |
| 10.1.10 | Empty state | Clara Seed | Verify "No areas to improve tracked yet." italic text. |

#### 10.2 Specific Difficulties
| # | Test | Student | Steps |
|---|------|---------|-------|
| 10.2.1 | Section label and tooltip | -- | Verify "Specific Difficulties" with FieldTooltip and helper text. |
| 10.2.2 | "Add" button | -- | Verify outline button. |
| 10.2.3 | Difficulty row layout | Ana Visual | Verify: description textarea, competency select, subcategory input, status button, trash icon. |
| 10.2.4 | Competency dropdown options | -- | Open dropdown. Verify COMPETENCY_OPTIONS (grammar, vocabulary, pronunciation, etc.). |
| 10.2.5 | Status toggle: Active / Covered | Ana Visual | Click status button. Verify toggle between "Active" and "Covered". |
| 10.2.6 | Severity bar visual | Ana Visual | Verify severity bar: green (low), amber (medium), red (high). |
| 10.2.7 | Trend indicator | Ana Visual | Verify trend icons: TrendingUp (green), TrendingDown (red), Minus (zinc) for improving/worsening/stable. |
| 10.2.8 | Auto-resize textarea | Ana Visual | Type a long description. Verify textarea grows vertically. |
| 10.2.9 | Validation: both competency and description required | -- | Add difficulty with only description (no competency). Verify "Both type and description are required" error on create. |
| 10.2.10 | Remove clears error | -- | Remove the invalid row. Verify error disappears. |
| 10.2.11 | Empty state | Clara Seed | Verify "No specific difficulties tracked yet." italic text. |

### 11. Notes Section

| # | Test | Student | Steps |
|---|------|---------|-------|
| 11.1 | Card title "Notes" | -- | Verify card header. |
| 11.2 | Two-column layout | -- | Verify "Sensitivities / Life Context" and "Pedagogical Observations" side by side on desktop. |
| 11.3 | Labels and tooltips | -- | Verify both labels with FieldTooltip icons. |
| 11.4 | PersonalNotes pre-populated | Ana Visual | Verify personal notes content. |
| 11.5 | TeachingNotes pre-populated | Ana Visual | Verify teaching notes content. |
| 11.6 | Placeholders | Clara Seed | Verify "Sensitivities, life context, anything to be aware of..." and "Learning style, teaching observations..." |
| 11.7 | Max length 2000 each | -- | Verify maxLength enforced. |
| 11.8 | Both fields: debounced save | Ana Visual | Type in either textarea. Verify `scheduleTextSave`. |

### 12. Commercial Info Section (Edit Mode Only)

#### 12.1 Visibility
| # | Test | Mode | Steps |
|---|------|------|-------|
| 12.1.1 | Section visible in edit mode | Ana Visual | Verify "Commercial Info" card present. |
| 12.1.2 | Section absent in create mode | -- | Navigate to `/students/new`. Verify Commercial Info card not rendered. |

#### 12.2 Account Status toggle (isActive)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 12.2.1 | Label and description | Ana Visual | Verify "Account Status" label with "Active" / "Inactive" description below. |
| 12.2.2 | **DESIGN CHECK** Toggle dimensions | Ana Visual | Verify `h-6 w-11` track, `h-4 w-4` thumb (per design-system.md 11.5). |
| 12.2.3 | Toggle colors | Ana Visual | Active = `bg-indigo-600`. Toggle off. Verify `bg-zinc-300`. |
| 12.2.4 | Description updates | Ana Visual | Toggle off. Verify description changes to "Inactive". |
| 12.2.5 | `role="switch"` and `aria-checked` | Ana Visual | Verify accessibility attributes on the toggle button. |
| 12.2.6 | Focus ring | Ana Visual | Tab to toggle. Verify `ring-2 ring-indigo-600` focus ring. |
| 12.2.7 | Immediate save on toggle | Ana Visual | Toggle. Verify `saveNow` fires. |

#### 12.3 Student Type toggle (isCorporate)
| # | Test | Student | Steps |
|---|------|---------|-------|
| 12.3.1 | Label and description | Ana Visual | Verify "Student Type" label with "Private" / "Corporate" description. |
| 12.3.2 | Toggle dimensions match 12.2.2 | Ana Visual | Verify same `h-6 w-11` / `h-4 w-4` dimensions. |
| 12.3.3 | Toggle on shows "Corporate" | Ana Visual | Toggle on. Verify description changes to "Corporate". |
| 12.3.4 | Immediate save on toggle | Ana Visual | Toggle. Verify `saveNow` fires. |

#### 12.4 Hourly Rate
| # | Test | Student | Steps |
|---|------|---------|-------|
| 12.4.1 | Label and placeholder | -- | Verify "Hourly Rate" label, placeholder "e.g. 45/hr". |
| 12.4.2 | Helper text | -- | Verify "Free text. No billing frequency tracked." |
| 12.4.3 | Max length 50 | -- | Verify maxLength enforced. |
| 12.4.4 | Max width constrained | -- | Verify input has `max-w-[200px]`. |
| 12.4.5 | Debounced save | Ana Visual | Type a rate. Verify `scheduleTextSave`. |

### 13. Sidebar (Edit Mode Only)

#### 13.1 Layout
| # | Test | Student | Steps |
|---|------|---------|-------|
| 13.1.1 | Sidebar visible in edit mode | Ana Visual | Verify sidebar panel on the right side of form. |
| 13.1.2 | Sidebar absent in create mode | -- | Navigate to `/students/new`. Verify no sidebar. |
| 13.1.3 | Sidebar sticky on scroll | Ana Visual | Scroll the form. Verify sidebar stays in view (`lg:sticky lg:top-[76px]`). |
| 13.1.4 | White rounded-2xl cards with ambient shadow | Ana Visual | Verify each sidebar card has `bg-white rounded-2xl` and `boxShadow: 0 12px 40px rgba(26, 27, 34, 0.06)`. |

#### 13.2 Teaching Todos Card
| # | Test | Student | Steps |
|---|------|---------|-------|
| 13.2.1 | Section header "Teaching Todos" | Ana Visual | Verify uppercase section header. |
| 13.2.2 | Pending todos listed | Ana Visual | Verify pending todos shown (seeded todo about subjunctive triggers). |
| 13.2.3 | **DESIGN CHECK** Todo checkbox: custom square | Ana Visual | Verify `w-4 h-4 rounded border-2 border-indigo-400` toggle (not native checkbox). Per 11.4. |
| 13.2.4 | Add input row | Ana Visual | Verify input + Plus button for adding new todos. |
| 13.2.5 | **DESIGN CHECK** Add button: filled `bg-indigo-600` | Ana Visual | Verify Plus button is filled indigo, not ghost variant. Per 11.1. |
| 13.2.6 | **DESIGN CHECK** Input placeholder | Ana Visual | Verify placeholder reads "Add a teaching idea..." Per 11.3. |
| 13.2.7 | Add a todo via Enter | Ana Visual | Type text, press Enter. Verify todo appears in list. |
| 13.2.8 | Add a todo via Plus button | Ana Visual | Type text, click Plus. Verify todo appears. |
| 13.2.9 | Toggle todo status (Pending/Covered/Dismissed) | Ana Visual | Click todo toggle. Verify visual state changes (strikethrough, muted). |
| 13.2.10 | Delete a todo | Ana Visual | Delete a todo. Verify removal. |
| 13.2.11 | Relative timestamps | Ana Visual | Verify "Xm ago", "Xh ago", "Xd ago" timestamps. |
| 13.2.12 | Sort order: pending first | Ana Visual | Verify pending todos above covered/dismissed ones. |
| 13.2.13 | Empty state | Clara Seed | If no todos, verify empty state text. |
| 13.2.14 | Sidebar uses separate query key | Ana Visual | Add a todo. Verify form fields are NOT reset (sidebar uses `['student', id]`, not `['students', id]`). |

#### 13.3 Pending Followups Card
| # | Test | Student | Steps |
|---|------|---------|-------|
| 13.3.1 | Section header "Pending Followups" | Ana Visual | Verify uppercase section header with count badge if pending > 0. |
| 13.3.2 | **DESIGN CHECK** Followup checkbox: custom circle | Ana Visual | Verify `w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-100` toggle. Per 11.4. |
| 13.3.3 | Toggle followup (pending/done) | Ana Visual | Click toggle. Verify visual state change (strikethrough, emerald fill). |
| 13.3.4 | Add followup input | Ana Visual | Verify input for adding new followups. |
| 13.3.5 | **DESIGN CHECK** Add button: filled `bg-amber-500` | Ana Visual | Verify Plus button is filled amber, not ghost variant. Per 11.1. |
| 13.3.6 | Overdue indicator | Ana Visual | If followup > 7 days old, verify visual overdue indicator. |
| 13.3.7 | Empty state | Clara Seed | Verify "No pending followups" italic text. |
| 13.3.8 | Done followups shown (last 3) | Ana Visual | If done followups exist, verify at most 3 shown below pending. |

### 14. Autosave Indicator

| # | Test | Student | Steps |
|---|------|---------|-------|
| 14.1 | Position: in section nav bar, right of pills | Ana Visual | Verify autosave indicator is inside the sticky section nav, to the left of the Done button. |
| 14.2 | Idle: nothing shown | Ana Visual | Before any changes, verify no status text. |
| 14.3 | Saving: spinner + "Saving..." | Ana Visual | Make a change. Verify Loader2 spinner + "Saving..." text in zinc-400. |
| 14.4 | Saved: checkmark + "All changes saved" | Ana Visual | After save completes. Verify green CheckCircle + "All changes saved" in zinc-500. |
| 14.5 | Retrying: refresh icon + "Couldn't save, retrying..." | -- | (Simulate network error.) Verify RefreshCw icon + red text. |
| 14.6 | Error: refresh icon + "Couldn't save" | -- | After max retries. Verify red text persists. |
| 14.7 | Done button disabled while saving | Ana Visual | During save, verify Done button is disabled. |

### 15. Done and Cancel Buttons

| # | Test | Mode | Steps |
|---|------|------|-------|
| 15.1 | Edit mode: Done button | Ana Visual | Verify `variant="outline" size="sm"` in section nav bar. |
| 15.2 | Done navigates to student detail | Ana Visual | Click Done. Verify URL is `/students/:id`. |
| 15.3 | Done disabled while saving | Ana Visual | Make change, immediately click Done. Verify disabled state during save. |
| 15.4 | Create mode: Save button style | -- | Verify "Save Student" with `bg-indigo-600` (primary). |
| 15.5 | Create mode: Save disabled while pending | -- | Click Save. Verify button text changes to "Saving..." and is disabled. |
| 15.6 | Create mode: Cancel navigates to /students | -- | Click Cancel. Verify URL is `/students`. |

### 16. Delete Student (Edit Mode Only)

| # | Test | Student | Steps |
|---|------|---------|-------|
| 16.1 | Danger zone at page bottom | Ana Visual | Scroll to bottom. Verify "Delete this student" text button in red. |
| 16.2 | Ghost style, not primary | Ana Visual | Verify `variant="ghost"` with red text, no filled background. |
| 16.3 | Click opens confirmation dialog | Ana Visual | Click "Delete this student". Verify AlertDialog appears. |
| 16.4 | Dialog title and description | Ana Visual | Verify "Delete this student?" title and permanent removal warning. |
| 16.5 | Cancel dismisses dialog | Ana Visual | Click "Cancel" in dialog. Verify dialog closes, student intact. |
| 16.6 | Delete button style: red filled | Ana Visual | Verify "Delete" button has `bg-red-600` in dialog. |
| 16.7 | Delete navigates to /students | -- | (Only test on a disposable student.) Confirm delete. Verify navigates to `/students`. |
| 16.8 | Delete error shown | -- | If API fails, verify error message appears. |

### 17. Courses Card (Below Form, Edit Mode Only)

| # | Test | Student | Steps |
|---|------|---------|-------|
| 17.1 | StudentCoursesCard rendered | Ana Visual | Verify courses card appears below the form. |
| 17.2 | Absent in create mode | -- | Verify no courses card in `/students/new`. |

### 18. Create Mode Validation

| # | Test | Steps |
|---|------|-------|
| 18.1 | Name required | Clear name, click Save. Verify "Name is required" error. |
| 18.2 | Language required | Leave language empty, click Save. Verify "Language is required" error. |
| 18.3 | CEFR level required | Leave CEFR empty, click Save. Verify "CEFR level is required" error. |
| 18.4 | Difficulty validation | Add difficulty with description but no competency. Click Save. Verify "Both type and description are required". |
| 18.5 | Valid form submits | Fill name + language + CEFR. Click Save. Verify navigation to student detail. |

### 19. Design System Compliance

#### 19.1 Typography
| # | Test | Steps |
|---|------|-------|
| 19.1.1 | Card titles use appropriate weight | Verify card titles use `text-base` (CardTitle). |
| 19.1.2 | Labels use Inter | Verify form labels use Inter font. |
| 19.1.3 | Text color: never pure black | Verify all text uses `#1A1B22` or zinc shades, never `#000000`. |

#### 19.2 No-Line Rule
| # | Test | Steps |
|---|------|-------|
| 19.2.1 | No 1px solid borders between sections | Verify sections separated by spacing/tonal shifts, not border lines. |
| 19.2.2 | Input fields: ghost border only | Verify input borders are subtle (zinc-200 or outline-variant at 20% opacity). |

#### 19.3 Cards
| # | Test | Steps |
|---|------|-------|
| 19.3.1 | Cards have white bg on surface canvas | Verify Card components use `surface-container-lowest` (white). |
| 19.3.2 | No divider lines within cards | Verify no `<hr>` or border-bottom between card sections. |

#### 19.4 Buttons
| # | Test | Steps |
|---|------|-------|
| 19.4.1 | Primary button for main CTA | Verify Save Student is indigo gradient in create mode. |
| 19.4.2 | Outline/secondary for supporting actions | Verify Done, Cancel, Add, Create Course are outline variant. |
| 19.4.3 | Ghost for destructive text button | Verify delete button is ghost with red text. |

---

## Pass 2: Playwright

*All Function layer tests. For existing tests: run and report result. For gaps: write test, run, report.*

### F1. Navigation functions

| # | Test | Student | Steps |
|---|------|---------|-------|
| F1.1 | Edit URL loads correct student | Ana Visual | Navigate to `/students/:id/edit`. Assert student name matches. |
| F1.2 | Invalid ID shows error | -- | Navigate to `/students/nonexistent-id/edit`. Assert "Student not found." text visible. |
| F1.3 | "Go back" link works | -- | On error page, click "Go back". Assert URL is `/students`. |
| F1.4 | Done navigates to `/students/:id` | Ana Visual | Click Done. Assert URL matches `/students/:id`. |
| F1.5 | Create mode: Save navigates to student detail | -- | Fill required fields, save. Assert URL matches `/students/:newId`. |
| F1.6 | Create mode: Cancel navigates to `/students` | -- | Click Cancel. Assert URL is `/students`. |
| F1.7 | Create Course button navigates correctly | Ana Visual | Click Create Course. Assert URL includes `/courses/new?studentId=`. |

### F2. Autosave mechanics

| # | Test | Student | Steps |
|---|------|---------|-------|
| F2.1 | Text fields debounce (~400ms) | Ana Visual | Type rapidly in name field. Assert single PUT fires after pause, not one per keystroke. |
| F2.2 | Select/toggle saves immediately | Ana Visual | Change CEFR level. Assert PUT fires without debounce delay. |
| F2.3 | Autosave blocked when name is empty | Ana Visual | Clear name field. Assert no PUT fires (validation blocks save). |
| F2.4 | Autosave blocked when language is empty | Ana Visual | Remove language. Assert no PUT fires. |
| F2.5 | Autosave status indicator shown | Ana Visual | Change a field. Assert `data-testid="autosave-status"` shows "Saving..." then "All changes saved". |
| F2.6 | No autosave in create mode | -- | Make changes in create mode. Assert no PUT/POST fires until Save clicked. |

### F3. Field persistence (edit round-trip)

**Student: Ana Visual.** Change field, wait for autosave, navigate away, return. Assert value persisted.

| # | Field | Value | Assert after return |
|---|-------|-------|---------------------|
| F3.1 | Name | "Ana Visual Test" | Input = "Ana Visual Test" |
| F3.2 | Learning Language | "French" | Chip = "French" |
| F3.3 | Teacher's Assessment | "C1" | Badge shows "C1" |
| F3.4 | Official Level | "B1" | Badge shows "B1" |
| F3.5 | Native Languages | add "French" | Chip "French" present alongside existing |
| F3.6 | Spoken Languages | add "German" | Chip "German" present |
| F3.7 | Skill Override: Reading | "C1" | Tile shows "Reading C1" |
| F3.8 | Birth Year | 1985 | Input = "1985" |
| F3.9 | Profession | "Data Scientist" | Input = "Data Scientist" |
| F3.10 | Country of Origin | "Portugal" | Input = "Portugal" |
| F3.11 | City of Origin | "Porto" | Input = "Porto" |
| F3.12 | Country of Residence | "Germany" | Input = "Germany" |
| F3.13 | City of Residence | "Berlin" | Input = "Berlin" |
| F3.14 | Reason for Studying | "Career change to tech" | Textarea = exact text |
| F3.15 | Interests | add "music" | Chip "music" present |
| F3.16 | Short-term objective text | "Pass IELTS by July" | Input = exact text |
| F3.17 | Short-term objective date | 2026-07-15 | Date input = "2026-07-15" |
| F3.18 | Weakness description | "Articles confusion" | Input = exact text |
| F3.19 | Weakness type | "lexical" | Dropdown = "Lexical" |
| F3.20 | Difficulty description | "Subjunctive in past" | Textarea = exact text |
| F3.21 | Difficulty competency | "grammar" | Dropdown shows grammar |
| F3.22 | Difficulty status | "Covered" | Button shows "Covered" |
| F3.23 | Personal Notes | "Shy about pronunciation" | Textarea = exact text |
| F3.24 | Teaching Notes | "Responds well to games" | Textarea = exact text |
| F3.25 | isActive | false | Toggle off, "Inactive" badge visible |
| F3.26 | isCorporate | true | Toggle on, description = "Corporate" |
| F3.27 | Rate | "25/hr" | Input = "25/hr" |

### F4. Create student round-trip

**Create a new student with all fields filled, then verify in edit mode.**

| # | Field | Value | Assert in edit mode |
|---|-------|-------|---------------------|
| F4.1 | Name | "Test Student" | Input = "Test Student" |
| F4.2 | Language | "Spanish" | Chip = "Spanish" |
| F4.3 | CEFR Level | "A2" | Badge shows "A2" |
| F4.4 | Official Level | "A1" | Badge shows "A1" |
| F4.5 | Native Languages | ["English"] | Chip "English" present |
| F4.6 | Interests | ["travel", "cooking"] | Both chips present |
| F4.7 | Birth Year | 1995 | Input = "1995" |
| F4.8 | Profession | "Teacher" | Input = "Teacher" |
| F4.9 | Reason for Studying | "Moving to Madrid" | Textarea = exact text |
| F4.10 | Personal Notes | "Test note" | Textarea = "Test note" |
| F4.11 | Teaching Notes | "Test teaching note" | Textarea = "Test teaching note" |

### F5. Edit persistence (change one field, verify others unchanged)

**Student: Ana Visual.**

| # | Test | Steps |
|---|------|-------|
| F5.1 | Change name only | Change name. Re-open. Assert new name AND all other fields unchanged. |
| F5.2 | Change CEFR only | A2 to B1. Re-open. Assert B1 and everything else unchanged. |
| F5.3 | Add an interest | Add to existing. Re-open. Assert old + new interests all present. |
| F5.4 | Remove an interest | Remove one. Re-open. Assert only that interest gone. |
| F5.5 | Add a difficulty | Add new. Re-open. Assert old + new difficulties present. |
| F5.6 | Remove a difficulty | Remove one. Re-open. Assert only that difficulty gone. |
| F5.7 | Toggle isActive | Toggle off. Re-open. Assert isActive=false AND form fields intact. |
| F5.8 | Clear Official Level | Set to "None". Re-open. Assert "Not set" button shown. |
| F5.9 | Add + remove objective | Add one, remove existing. Re-open. Assert only new objective remains. |

### F6. Autosave trigger verification

| # | Test | Student | Steps |
|---|------|---------|-------|
| F6.1 | Name change triggers debounced save | Ana Visual | Type in name. Assert PUT fires after ~400ms pause. |
| F6.2 | CEFR change triggers immediate save | Ana Visual | Select new level. Assert `saveNow` (not debounced). |
| F6.3 | Language change triggers immediate save | Ana Visual | Change language. Assert `saveNow`. |
| F6.4 | Skill override change triggers immediate save | Ana Visual | Change a skill level. Assert `saveNow`. |
| F6.5 | Interest add triggers immediate save | Ana Visual | Add interest. Assert `saveNow`. |
| F6.6 | Interest remove triggers immediate save | Ana Visual | Remove interest. Assert `saveNow`. |
| F6.7 | Objective add triggers immediate save | Ana Visual | Click "Add Objective". Assert `saveNow`. |
| F6.8 | Objective remove triggers immediate save | Ana Visual | Remove objective. Assert `saveNow`. |
| F6.9 | Objective text triggers debounced save | Ana Visual | Edit objective text. Assert debounced. |
| F6.10 | isActive toggle triggers immediate save | Ana Visual | Toggle. Assert `saveNow`. |
| F6.11 | isCorporate toggle triggers immediate save | Ana Visual | Toggle. Assert `saveNow`. |
| F6.12 | Rate triggers debounced save | Ana Visual | Type rate. Assert debounced. |
| F6.13 | Learning goals change triggers immediate save | Ana Visual | Add a goal. Assert `saveNow`. |
| F6.14 | Weakness add triggers immediate save | Ana Visual | Click "Add". Assert `saveNow`. |
| F6.15 | Weakness remove triggers immediate save | Ana Visual | Click trash. Assert `saveNow`. |
| F6.16 | Weakness text triggers debounced save | Ana Visual | Edit text. Assert debounced. |
| F6.17 | Difficulty add triggers immediate save | Ana Visual | Click "Add". Assert `saveNow`. |
| F6.18 | Difficulty remove triggers immediate save | Ana Visual | Click trash. Assert `saveNow`. |
| F6.19 | Difficulty text triggers debounced save | Ana Visual | Edit text. Assert debounced. |
| F6.20 | Difficulty status toggle triggers debounced save | Ana Visual | Click Active/Covered. Assert debounced (goes through `updateDifficulty`). |

### F7. No silent field clearing

| # | Test | Student | Steps |
|---|------|---------|-------|
| F7.1 | Changing name preserves all other fields | Ana Visual | Change name. Re-open. Assert interests, difficulties, objectives, notes, toggles all unchanged. |
| F7.2 | Adding interest preserves difficulties | Ana Visual | Add interest. Re-open. Assert difficulties list intact. |
| F7.3 | Toggling isActive preserves profile fields | Ana Visual | Toggle isActive. Re-open. Assert all profile fields unchanged. |
| F7.4 | Removing a difficulty preserves weaknesses | Ana Visual | Remove difficulty. Re-open. Assert weaknesses list intact. |
| F7.5 | Changing skill overrides preserves CEFR level | Ana Visual | Change Reading override. Re-open. Assert cefrLevel unchanged. |

### F8. Edge cases

| # | Test | Student | Steps |
|---|------|---------|-------|
| F8.1 | Empty name blocked from saving | Ana Visual | Clear name. Verify no autosave fires. Put name back. Verify save resumes. |
| F8.2 | Empty language blocked from saving | Ana Visual | Clear language. Verify no autosave fires. |
| F8.3 | Blank interests not added | -- | Type spaces, press Enter. Assert no chip created. |
| F8.4 | Whitespace-only name fails validation | -- | Type "   " in name. Assert "Name is required" error. |
| F8.5 | Delete button disabled while deleting | Ana Visual | Start delete operation. Assert button disabled during API call. |
| F8.6 | Browser refresh preserves last saved state | Ana Visual | Change a field (autosave fires). Refresh browser. Assert field shows autosaved value. |
| F8.7 | Concurrent sidebar todo mutation does not reset form | Ana Visual | Start editing a text field. Add a todo in sidebar. Assert text field still shows in-progress edit (not reset). |

---

## Cross-Screen Consistency

*Navigate between screens to compare identical components side by side.*

| # | Test | Screens to compare | What to check |
|---|------|-------------------|---------------|
| C1 | Todo checkbox visual | Edit Student sidebar vs LogSession left panel | Same square toggle, same colors, same checked state |
| C2 | Followup checkbox visual | Edit Student sidebar vs LogSession left panel | Same circle toggle, same colors, same done state |
| C3 | Todo add input style | Edit Student sidebar vs LogSession right panel | Same `<Input>` component, same `bg-indigo-50`, same placeholder |
| C4 | Followup add input style | Edit Student sidebar vs LogSession right panel | Same `<Input>` component, same `bg-amber-50`, same placeholder |
| C5 | Todo add button | Edit Student sidebar vs LogSession right panel | Same filled `bg-indigo-600 rounded-lg` with Plus icon |
| C6 | Followup add button | Edit Student sidebar vs LogSession right panel | Same filled `bg-amber-500 rounded-lg` with Plus icon |
| C7 | Toggle switch size | Edit Student (isActive, isCorporate) vs LogSession (cancelled, reassessment) | Same `h-6 w-11` dimensions |
| C8 | Autosave indicator | Edit Student vs LogSession | Same icon set, same text, same positioning |
| C9 | Done button | Edit Student vs LogSession | Same `variant="outline" size="sm"` |
| C10 | CEFR badge | Edit Student (Teacher's Assessment) vs Student Detail header vs LogSession left panel | Same `CefrBadge` component, same colors |
| C11 | Interest chips | Edit Student vs Student Detail Profile tab | Same indigo-50 bg, rounded-full, same font |
| C12 | Difficulty status | Edit Student (Active/Covered button) vs LogSession left panel difficulty checkboxes | Status toggle works consistently |
| C13 | Section nav pills | Edit Student vs any other screen with similar nav | Same pill style, same active indicator |

---

## Known Design System Items to Verify

Items from `docs/design-system.md` that apply specifically to this screen:

1. Toggle switches must use `h-6 w-11` track, `h-4 w-4` thumb (11.5)
2. Todo add button must be filled `bg-indigo-600` (11.1, 11.2)
3. Followup add button must be filled `bg-amber-500` (11.1, 11.2)
4. Todo placeholder must be "Add a teaching idea..." (11.3)
5. Followup placeholder must be "Add followup..." (11.3)
6. Todo checkbox must be custom square `w-4 h-4 rounded border-2 border-indigo-400` (11.4)
7. Followup checkbox must be custom circle `w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-100` (11.4)
8. No native HTML `<input type="checkbox">` anywhere (11.4)
9. No 1px solid borders for sectioning (No-Line Rule)
10. All text `#1A1B22`, never `#000000`
