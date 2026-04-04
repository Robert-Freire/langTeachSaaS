# LangTeach Redesign with Google Stitch

**Purpose:** Prompts and screenshots for redesigning LangTeach UI using [stitch.withgoogle.com](https://stitch.withgoogle.com/).

**How to use:**
1. Use Experimental Mode in Stitch for higher-quality output (50 generations/month free).
2. Go through prompts in order (0 through 8). Each builds on the previous.
3. After generating each screen, iterate: "make the cards more compact", "increase whitespace", "try a darker sidebar", etc.
4. Once you like the direction, upload the current screenshots and say "redesign this screen in the style of [the generated dashboard]".
5. Export as Figma for a reference design system, or copy the HTML/CSS to experiment directly.

---

## Prompt 0: Design System Foundation

Use this first to establish a consistent visual language across all screens.

> Design a modern design system for "LangTeach", a B2B SaaS web app for independent language teachers. The app helps teachers plan structured lessons with AI-assisted content generation.
>
> Brand personality: professional but warm, educational but not childish. Target users are adult language teachers (30-55 years old) who work independently.
>
> Color palette: indigo as primary accent, zinc neutrals for backgrounds and text, emerald for success states, amber for warnings, red for errors. Clean white cards on a light gray background.
>
> Typography: modern geometric sans-serif (like Geist or Inter). Components should feel like a polished productivity tool, not a consumer app.
>
> Show: color swatches, button styles (primary, secondary, ghost), card style, badge styles for CEFR language levels (A1, A2, B1, B2, C1, C2), form input style, and navigation item states (active, inactive, hover).

**Current screenshot:** (no equivalent screen, this is new)

---

## Prompt 1: App Shell + Dashboard

> Design the main dashboard of "LangTeach", a web app for language teachers. Left sidebar navigation (240px wide, white background, subtle right border) with these items: Dashboard, Students, Lessons, Courses, Settings. Show "LangTeach" as a text wordmark at the top of the sidebar in indigo. Include a user avatar and name at the bottom of the sidebar.
>
> The dashboard content area (light gray background) shows:
> - A weekly calendar strip at the top showing scheduled lessons for this week
> - Two summary cards: "12 Students" and "8 Lessons this week"
> - A section of unscheduled lesson drafts that need scheduling
> - A courses overview showing progress bars for active courses
>
> The teacher has students learning Spanish, English, and German at various CEFR levels. Make it feel like a productive teaching command center, not an LMS.

**Current screenshot:**

![Dashboard](screenshots/dashboard.png)
<!-- TODO: capture / (dashboard) -->

---

## Prompt 2: Students List

> Design the Students page for LangTeach. Same sidebar layout as before.
>
> Content area shows a grid of student profile cards. Each card displays: student name, a small avatar/initial circle, learning language (with a subtle flag or badge), CEFR level badge (color-coded: A1-A2 green, B1-B2 blue, C1-C2 purple), native language, and a short list of their interests/topics.
>
> Include a search bar at the top, filter dropdowns for language and level, and a prominent "Add Student" button. Show 6-8 sample students with realistic names learning Spanish, English, or German at different CEFR levels.
>
> Cards should be scannable at a glance. The teacher needs to quickly find the right student when planning a lesson.

**Current screenshot:**

![Students List](screenshots/students-list.png)
<!-- TODO: capture /students -->

---

## Prompt 3: Student Detail

> Design the Student Detail page for LangTeach. Show a student profile for "Ana Garcia", a B1 Spanish learner.
>
> Top section: student name, avatar, key stats (language, level, native language, enrolled since date).
>
> Below that, two tabs: "Overview" and "History".
>
> Overview tab shows: profile summary card (interests, notes from the teacher), enrolled courses with progress, and a timeline of recent lessons with dates and topics.
>
> History tab shows: a session log table with columns for date, lesson title, topic, duration, and status (completed, cancelled, rescheduled).
>
> Include a floating action button or header button to "Create Lesson" for this student.

**Current screenshot:**

![Student Detail](screenshots/student-detail.png)
<!-- TODO: capture /students/:id (pick Ana or a student with history) -->

---

## Prompt 4: Lessons List

> Design the Lessons page for LangTeach. Content area shows a list of lesson cards.
>
> Each lesson card shows: lesson title, student name with avatar, language badge, CEFR level badge, topic, estimated duration (45min/60min/90min), status badge (Draft, Ready, Scheduled, Completed), and action buttons (edit, duplicate, delete).
>
> Include filters at the top: search bar, language dropdown, CEFR level dropdown, status dropdown. Plus a prominent "New Lesson" button.
>
> Show 5-6 sample lessons in various states. Some scheduled with dates, some drafts, one completed. Make the status visually distinct so the teacher can scan their lesson pipeline quickly.

**Current screenshot:**

![Lessons List](screenshots/lessons-list.png)
<!-- TODO: capture /lessons (with several lessons in different states) -->

---

## Prompt 5: Lesson Editor (the core screen)

> Design the Lesson Editor page for LangTeach. This is the most important screen, where teachers build structured lesson plans with AI assistance.
>
> Left panel (or top section): lesson metadata with title, student, language, CEFR level, topic, duration, learning objectives, and scheduled date.
>
> Main content area: 5 collapsible/expandable sections in order: Warm Up, Presentation, Practice, Production, Wrap Up. Each section has a header with an icon, a text content area showing the generated lesson content, and an "AI Generate" button with a sparkle icon.
>
> Right panel or floating panel: AI generation controls. Show a prompt input where the teacher can guide the AI, with options for tone (formal/conversational) and focus areas.
>
> Show the "Practice" section expanded with realistic Spanish B1 lesson content (a fill-in-the-blank exercise about the subjunctive mood). Other sections collapsed.
>
> This should feel like a focused writing/editing workspace, similar to Notion or a document editor, not a form.

**Current screenshot:**

![Lesson Editor - Collapsed](screenshots/lesson-editor-collapsed.png)
<!-- TODO: capture /lessons/:id with sections collapsed -->

![Lesson Editor - Expanded](screenshots/lesson-editor-expanded.png)
<!-- TODO: capture /lessons/:id with Practice section expanded showing AI content -->

---

## Prompt 6: Courses List + Course Detail

> Design two connected screens for LangTeach courses.
>
> Screen 1 - Courses List: cards showing course name, mode badge (General or Exam Prep), target CEFR level, assigned student name, and a progress bar showing "5/12 sessions created". Include "New Course" button.
>
> Screen 2 - Course Detail: a curriculum editor showing an ordered list of session entries. Each row shows: session number, topic, grammar focus tags, competency badges (Reading, Writing, Speaking, Listening), session type, and status (content created / pending / taught). Include drag handles for reordering, plus buttons to add/edit/delete sessions. Show a warning banner if there are curriculum gaps (e.g., "No speaking practice in sessions 4-7").
>
> This should feel like a curriculum planning spreadsheet, structured but not rigid.

**Current screenshots:**

![Courses List](screenshots/courses-list.png)
<!-- TODO: capture /courses -->

![Course Detail](screenshots/course-detail.png)
<!-- TODO: capture /courses/:id (pick one with several sessions) -->

---

## Prompt 7: Onboarding Flow

> Design a 3-step onboarding wizard for LangTeach, for a new teacher who just signed up.
>
> Step 1 - "Your Profile": form fields for display name, teaching languages (multi-select badges for Spanish, English, German, French, etc.), and teaching style preference (Formal, Conversational, Exam Prep as toggle cards).
>
> Step 2 - "Your First Student": simplified student creation form with name, learning language, CEFR level, native language, and interests.
>
> Step 3 - "Your First Lesson": show a pre-filled lesson being generated with AI, with a progress animation. Then reveal the generated lesson sections.
>
> Include a step indicator at the top (3 dots or numbered steps), a progress bar, and "Back" / "Continue" navigation. Make it feel quick and encouraging, not bureaucratic.

**Current screenshots:**

![Onboarding Step 1](screenshots/onboarding-step1.png)
<!-- TODO: capture /onboarding step 1 -->

![Onboarding Step 2](screenshots/onboarding-step2.png)
<!-- TODO: capture /onboarding step 2 -->

![Onboarding Step 3](screenshots/onboarding-step3.png)
<!-- TODO: capture /onboarding step 3 -->

---

## Prompt 8: Settings / Profile

> Design the Settings page for LangTeach. A simple, clean form layout.
>
> Card sections for: Profile (display name, email, avatar), Teaching Preferences (languages, CEFR levels, teaching style), and Account (subscription tier display, usage meter showing "142/200 AI generations used this month", sign out button).
>
> Keep it minimal. This is a page teachers visit rarely.

**Current screenshot:**

![Settings](screenshots/settings.png)
<!-- TODO: capture /settings -->

---

## Screenshot Checklist

| # | Route | File | Captured |
|---|-------|------|----------|
| 1 | `/` | `screenshots/dashboard.png` | [ ] |
| 2 | `/students` | `screenshots/students-list.png` | [ ] |
| 3 | `/students/:id` | `screenshots/student-detail.png` | [ ] |
| 4 | `/lessons` | `screenshots/lessons-list.png` | [ ] |
| 5 | `/lessons/:id` (collapsed) | `screenshots/lesson-editor-collapsed.png` | [ ] |
| 6 | `/lessons/:id` (expanded) | `screenshots/lesson-editor-expanded.png` | [ ] |
| 7 | `/courses` | `screenshots/courses-list.png` | [ ] |
| 8 | `/courses/:id` | `screenshots/course-detail.png` | [ ] |
| 9 | `/onboarding` (step 1) | `screenshots/onboarding-step1.png` | [ ] |
| 10 | `/onboarding` (step 2) | `screenshots/onboarding-step2.png` | [ ] |
| 11 | `/onboarding` (step 3) | `screenshots/onboarding-step3.png` | [ ] |
| 12 | `/settings` | `screenshots/settings.png` | [ ] |

## Notes

- Screenshots should be taken at 1440x900 (standard laptop viewport) for consistency.
- Use a teacher account with enough data (students, lessons, courses) to look realistic.
- For the lesson editor, pick a lesson with AI-generated content in at least the Practice section.
