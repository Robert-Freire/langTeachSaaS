# Sprint Test Script: Curriculum & Personalization

**Goal:** Quick walkthrough of everything in the sprint before merging to main.
**Time:** ~30 minutes.
**Branch:** `sprint/curriculum-personalization`
**How:** Run the dev stack locally, walk through each section. Check the box when done.

---

## 0. Setup

- [ ] Pull and run the sprint branch:
  ```
  git checkout sprint/curriculum-personalization; git pull
  ```
- [ ] Start the dev stack (`docker compose up --build -d`)
- [ ] Log in with your Auth0 account

---

## 1. Student Form: Custom Free-Text Entries (#161)

> Learning Goals and Areas to Improve now accept custom text, not just predefined options.

- [ ] Go to any existing student (or create one)
- [ ] In **Learning Goals**, type something custom (e.g., "prepare presentations for port meetings") and press Enter
- [ ] Verify it appears as a chip alongside any predefined selections
- [ ] Do the same in **Areas to Improve** (e.g., "confuses ser/estar in past tense")
- [ ] Save the student, reopen, verify custom entries persisted

---

## 2. Student Form: Difficulties Filtered by Language (#150)

> Areas to Improve now shows language-appropriate options.

- [ ] Open a student whose target language is **Spanish**
- [ ] Open the Areas to Improve dropdown: you should see Spanish-relevant items (ser/estar, subjunctive, por/para...) and NOT English-only items (phrasal verbs, articles)
- [ ] If you have an **English** student, check theirs too: should show phrasal verbs, conditionals, etc.
- [ ] Verify the custom free-text entries from step 1 are still there (they coexist with filtered presets)

---

## 3. Lesson Form: Auto-Fill from Student (#154)

> Selecting a student pre-populates language and CEFR level.

- [ ] Create a new lesson
- [ ] Notice the **student selector is now above** language and level fields
- [ ] Select a student who has a language and level set
- [ ] Verify language and level auto-fill from the student profile
- [ ] Verify you can still manually change the auto-filled values
- [ ] Clear the student selection: language/level should NOT be cleared

---

## 4. AI Generation: No Phantom Materials (#184)

> AI no longer references images, audio, or objects that don't exist.

- [ ] Open a lesson linked to a student, go to a section (e.g., Practice or Production)
- [ ] Generate content with AI
- [ ] Read through the generated exercises: they should be **self-contained text-only**
- [ ] No "look at this image," "listen to this audio," "describe this picture," or "use the handout"

---

## 5. AI Generation: Difficulty Targeting (#157)

> AI uses the student's specific difficulties when generating content.

- [ ] Make sure your test student has at least one specific difficulty (e.g., "ser/estar in past tense" for a Spanish B1 student)
- [ ] Generate content for a lesson linked to that student
- [ ] Check that the generated content targets or references the difficulty (e.g., exercises specifically about ser/estar, not generic grammar)
- [ ] Look for difficulty info in the lesson metadata or section headers

---

## 6. Content Display: No Raw JSON in Editor (#192)

> When AI returns unexpected formats, the editor handles it gracefully.

- [ ] After generating content in step 4 or 5, check that all content blocks render as **typed views** (vocabulary table, exercise cards, etc.)
- [ ] You should NEVER see raw JSON like `{"items":[{"word":"museo",...}]}` in a textarea
- [ ] If a block can't be parsed, you should see a friendly error with a Regenerate button, not raw JSON

---

## 7. Curriculum Data & Course Planner Templates (#163, #164)

> Jordi's Instituto Cervantes programs are now structured data powering course templates.

- [ ] Go to the **Course Planner** (create a new course)
- [ ] Check that Instituto Cervantes templates are available (one per CEFR level)
- [ ] Select a template (e.g., B1.1)
- [ ] Verify it pre-populates units with grammar topics, vocabulary themes, and communicative objectives
- [ ] Verify you can edit/customize the template after selection

---

## 8. Grammar-Constrained Generation (#164)

> AI generation respects level-appropriate grammar boundaries.

- [ ] Generate content for an **A1** student
- [ ] Verify grammar stays simple (present tense, basic vocabulary): no subjunctive, no conditionals
- [ ] Generate content for a **B2** student
- [ ] Verify it uses more advanced structures appropriate to that level
- [ ] (This is hard to test precisely; just look for obvious mismatches like C1 grammar in an A1 lesson)

---

## 9. Onboarding: Skippable Steps (#213)

> Steps 2 (create student) and 3 (create lesson) can now be skipped.

- [ ] Log in as a new teacher (or clear onboarding state)
- [ ] Complete step 1 (profile), then check steps 2 and 3 have a **Skip** option
- [ ] Skip both, verify you land on dashboard with an empty state that guides you

---

## 10. AI Quality: WarmUp, Reading, Exam Prep, Vocabulary (#226, #227, #228, #229)

> Four fixes to AI generation quality. Test by generating content and eyeballing.

- [ ] Generate a lesson for any student: **WarmUp section should be a conversational icebreaker** (not a vocabulary drill or grammar exercise)
- [ ] Generate a **Reading & Comprehension** lesson: should include an actual reading passage (300+ words), not just questions
- [ ] Generate an **Exam Prep** lesson (pick DELE/Cambridge template): practice/production should have written tasks with time limits, not oral role-play
- [ ] Generate vocabulary for a student with a known native language: items should include **L1 translations** and match the student's CEFR level

---

## 11. Student Form Polish (#241, #242)

> UX fixes from backlog triage.

- [ ] Open a student with multiple weaknesses: chips should be **visible without scrolling** and dropdown shouldn't overlap cards above
- [ ] Switch the student's target language: language-specific weaknesses should clear, common ones (like "Past Tenses") should stay
- [ ] Create a new lesson, select a student: notice the **hint text** about auto-fill below the selector
- [ ] Generate content that fails to parse (hard to trigger manually, skip if needed): should show only **one** Regenerate button, not two

---

## 12. Quick Regression Check

> Make sure existing features still work.

- [ ] Dashboard loads, shows lessons and students
- [ ] Create a lesson end-to-end (title, template, student, generate all sections)
- [ ] PDF export works (download a lesson as PDF)
- [ ] Duplicate a lesson
- [ ] Search/filter lessons

---

## Verdict

| # | Feature | Pass? | Notes |
|---|---------|-------|-------|
| 1 | Custom free-text entries (#161) | | |
| 2 | Language-filtered difficulties (#150) | | |
| 3 | Auto-fill from student (#154) | | |
| 4 | No phantom materials (#184) | | |
| 5 | Difficulty targeting (#157) | | |
| 6 | No raw JSON (#192) | | |
| 7 | Curriculum templates (#163, #164) | | |
| 8 | Grammar constraints (#164) | | |
| 9 | Skippable onboarding (#213) | | |
| 10 | AI quality (warmup, reading, exam, vocab) | | |
| 11 | Student form polish (#241, #242) | | |
| 12 | Regression | | |

**Decision:** [ ] Ready to merge to main / [ ] Needs fixes first
