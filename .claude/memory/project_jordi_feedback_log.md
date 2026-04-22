---
name: Jordi Freire feedback log
description: Running log of feedback from Jordi (Robert's brother, language teacher, Head of Discovery) with status of each item
type: project
---

## Contact

- **Name:** Jordi Freire
- **Email:** jordim.freire@gmail.com
- **Role:** Language teacher, first customer and pilot user for LangTeach. NOT a PM or co-builder. We treat him as a client: show working software, collect reactions, build from his input without making him manage our backlog.
- **Language:** Communicates in Spanish

## Feedback Round 1 (2026-03-18, voice notes + summary)

Source: Voice notes transcribed and summarized by Robert.

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 1 | Need a Course entity wrapping lessons toward CEFR goals | Phase 2A: Course Planner | Planned |
| 2 | Separate exam-prep mode (DELE, DALF, Cambridge, TOEFL) | Phase 2A: Course Planner (exam mode) | Planned |
| 3 | Zero-friction post-class audio notes (WhatsApp-style) | Phase 2A: Audio Reflections | Planned |
| 4 | Track specific difficulties at granular level (ser/estar, /r/ pronunciation) | Phase 2A: Enhanced Difficulty Tracking | Planned |
| 5 | Accept teacher PDFs/worksheets, learn teacher's style | Phase 2A: Material Upload + future adaptive style | Partial (upload planned, style learning is Phase 3+) |
| 6 | Structured text correction with categorized errors (grammar, vocab, verb forms) | Phase 3: Evaluation | Planned |
| 7 | Richer output formats: infographics, crosswords, board games, slides | Phase 3: Content Library | Future |
| 8 | Capture emotional engagement signals in audio reflections | Phase 2A: Audio Reflections (enhancement) | Planned |

## Feedback Round 2 (2026-03-19, email reply)

Source: Email reply to PM's response. Jordi elaborated on exercise handling.

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 9 | Exercise correction must show correct answer + explain WHY | Near-term (could be Phase 2A or late Beta) | **New, actionable** |
| 10 | System should learn from student errors: detect repetitive mistakes, propose extra activities/explanation | Phase 2A: Enhanced Difficulty Tracking | Validates existing plan |
| 11 | Track error reduction over time, give positive feedback when improving | Phase 2A: Enhanced Difficulty Tracking (enhancement) | **New detail** |
| 12 | All exercise results + teacher class comments should feed into adapting the program | Phase 2A: Audio Reflections + Course Planner convergence | Validates existing plan |

## Feedback Round 3 (2026-03-19, email + audio answers to prioritization questions)

Source: Email with inline answers to our 4 questions + separate audio voice note.

### Answers to prioritization questions

| Question | Answer | Implication |
|----------|--------|-------------|
| More time on new material or adapting existing? | **Adapting existing material.** Uses resources from academy, internet (ProfeDeELE, Arche ELE), Canva to customize. Created infographic with Gemini (had errors). | **Material Upload is higher priority than pure generation.** The "before" is: download PDF, open Canva, adapt. The "after" should be: upload resource, AI adapts for this student. |
| How structure non-CEFR progression? | "The app should help provide a base and orientation." Uses student's concrete needs + whatever book/material available. | **Validates Course Planner.** Teachers want the system to help structure progression, not just generate individual lessons. |
| Audio post-class: between classes or end of day? | "Depends on time between classes, but it shouldn't be a determining factor. Why do you consider it so important?" | **Skeptical about audio.** We oversold it. Reframe as optional, low-key input, not a core workflow. Course Planner itself is what he actually wants. |
| Work with academies? | **Yes**, works in academy and with private students. | Institutional customization is a real need from direct experience. Stays in Future but confirmed as grounded. |

### New feedback items

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 13 | Online whiteboard for live classes: share with student, upload materials, annotate (says most useful Preply feature) | Phase 3: Live Whiteboard + Call | Validates roadmap placement, no scope change |

## Feedback Round 4 (2026-03-21, email reply)

Source: Email reply to our "Datos del colega" thread. Did NOT answer questions about Teacher B's identity. Provided new feature feedback instead.

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 14 | **Grammar-constrained generation**: Generate text with specific grammatical constraints (e.g., "B2 connectors + subjunctive, but only regular verbs"). Teachers at high levels need to isolate structures, not just "generate B2 content." | Phase 2A: Prompt service enhancement. Extends current generation with grammar constraint parameters. | **New, actionable** |
| 15 | **Real internet content search**: Find real articles, videos, poems matching topic + level. Example: article about eco-tourism for B1 vocabulary, or a poem for A1.2 present tense practice. | Phase 3: Content Library / web search integration. High desire but significant technical scope (web crawling, copyright, content evaluation). | **New, Phase 3** |
| 16 | **Cultural content emphasis**: Wants to work more with cultural aspects (poetry, art, traditions). System should surface culturally rich materials. | Phase 3: extends #15. Could partially address via prompt tuning ("include cultural references") in Phase 2A. | **New, partial near-term** |
| 17 | **Deep student profile in generation**: Example: "Dutch student, ship captain, loves rugby and art, speaks French and English." System should use ALL of this in material creation. | Already supported in student profiles (native language, interests, profession). Validates current architecture. | **Validation** |

Raw: `feedback/raw/2026-03-21-jordi-email-round4.txt`

## Teacher B Identity (2026-03-21, email reply)

Jordi answered our questions about Teacher B:
- **Pseudonym:** "Pedro Sanchez" (Jordi prefers not to share real name)
- **Academy:** Not relevant, works at multiple academies
- **Language taught:** Spanish
- **Contact:** Via Jordi's email only. Jordi declined to share personal data.

Raw: `feedback/raw/2026-03-21-jordi-email-teacherb-identity.txt`

## Feedback Round 5 (2026-03-21, video call ~57 min)

Source: Video call Robert + Jordi. Recorded from both devices (3 emails, same call). Transcript saved from Robert's recording (better quality).

### Key feedback items

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 18 | **Course index/syllabus**: App needs structured index per level (grammar, lexical, communicative content). Based on Instituto Cervantes standards. B2.1 = 40h = 40 classes, each with defined content. Should show on teacher dashboard AND be visible to students. | Phase 2A: Course Planner (#98) | **Reinforced with concrete example** (showed book index) |
| 19 | **Student PDF = learning summary**: Student-facing PDF should be a summary of what was learned (vocab, grammar), not per-activity export. Will send "systematization" example. | Phase 2A or existing PDF export enhancement | **New detail** |
| 20 | **Monthly calendar view**: Dashboard should offer monthly calendar, not just weekly. | Phase 2A: Dashboard enhancement | **New request** |
| 21 | **Placement test**: Need ability to assess student level if unknown. Preply has built-in one, very useful. | Phase 3: Placement Test Generation (already planned) | **Reinforced** |
| 22 | **Activity labels showing targets**: Every activity should display what it works on (grammar + communicative level). E.g., "this text: infinitive, prepositions, tourism vocabulary." | Phase 2A: Content block metadata | **New detail** |
| 23 | **Warm-up is not a formal activity**: Warm-up = conversation to ease in. Low levels: reduce tension. Higher: start speaking. Should adapt to level, not be a structured exercise. | Current warm-up section behavior | **Clarification** |
| 24 | **Post-class tracking (showed Excel)**: Jordi showed his actual tracking: date, planned content, what he did, homework sent, observations (e.g., "needs ser/estar and past tenses"). This is the workflow the app should formalize. | Phase 2A: Audio Reflections / post-class notes | **Concrete workflow example** |
| 25 | **Diverse homework types**: Not just fill-in-the-gap. Activities: writing, recording audio, in-class speaking, conversation. Need to define supported activity types. | Phase 2A: Content types expansion | **New detail** |
| 26 | **AI is secondary to organization**: "The most important thing is not the AI. It's having a place to manage all course information." AI generation is nice but the management/organizational tool is the core value. | Strategic direction | **Important strategic signal** |
| 27 | **Conversational course mode**: Not everything follows academic curriculum. Need a "conversational" course type without strict curriculum structure. | Phase 2A: Course Planner (course type variant) | **New request** |
| 28 | **Editable everything**: All generated content must be highly editable. "The magic is not in the generation, it's in not having a blank page." | Already supported, validates approach | **Validation** |
| 29 | **Semana Santa target**: Agreed goal is app usable enough for Jordi to start testing real workflows by Easter (~April 5-6). | Sprint planning | **Deadline alignment** |
| 30 | **Will send course programs**: Jordi will send Instituto Cervantes course programs for all levels he teaches (A1.1, A1.2, B1, B2, etc.) for us to build standardized templates. | Awaiting materials | **Pending from Jordi** |

### Preply walkthrough notes

Jordi showed Preply live. Key observations:
- AI learning assistant exists but neither Jordi nor students use it
- Whiteboard with material upload is Jordi's favorite feature (confirmed from Round 3)
- CRM-style pre-built messages for student outreach (future feature, low priority)
- Student onboarding collects: learning needs, time commitment, focus areas, native language, languages spoken, hobbies, specific needs

### Teacher B update

- Jordi mentioned Teacher B's audio hasn't been responded to yet. Will tell him to reply.
- Robert reminded Jordi to label all audios with the person's name/pseudonym.

Raw: `feedback/raw/2026-03-21-jordi-call-round5.txt`

## Materials Received (2026-03-21, email "programa")

Jordi sent 19 PDFs, all saved to `feedback/raw/2026-03-21-jordi-programs/`:

- **Course programs (15 levels):** A1.1, A1.2, A2.1, A2.2, A2.2+, B1.1, B1.1+, B1.2, B1.2+, B2.1, B2.2, C1.1, C1.1+, C1.2, C1.2+
- **Systematization examples (2):** "Sistematizacion la casa.pdf", "4.Gustar.pdf" (end-of-class student summary format)
- **Grammar content maps (2):** "Contenidos gramaticales por nivel.pdf", "Contenidos gramaticales por nivel y subnivel.pdf"

**Attribution correction (2026-03-21):** Jordi clarified these are NOT from Instituto Cervantes. They are from his academy and an internet source, but he considers them the best model for what we need. Do not reference "Instituto Cervantes" when describing this data.

These are key inputs for Course Planner (issue 98): standardized curricula with communicative + grammatical content per level.

**Reply sent (2026-03-21):** Emailed Jordi explaining our 3-phase plan for the data (extract into structured JSON, integrate as Course Planner templates, use for grammar-constrained generation). No demo date promised. Issues created: 163 (extraction, P1), 164 (integration, P2), 165 (labels + guardrails, P3).

## Feedback Round 6 (2026-03-21, email reply to whiteboard questions)

Source: Email reply to PM's whiteboard clarification questions. Answered every question inline.

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 31 | **Confirmed digital whiteboard** (not Canva). Likes Preply's because he can upload documents and write on them. Miro doesn't work for him (can't upload materials). | Solo Whiteboard (#174) | **Confirmed** |
| 32 | **Primary use: during live class.** Uploads materials before class starts (theory, videos, exercises), shares with student, works on it together. | Solo Whiteboard (#174) | **Key workflow detail** |
| 33 | **Upload + annotate is core**: uploads fill-in-the-blank PDFs, student fills them in on the whiteboard. Also wants video/audio upload and Word-like text writing (not freehand drawing). | Solo Whiteboard (#174) | **Key requirement** |
| 34 | **Interactive for both**: student also writes/interacts on the whiteboard. | Collaborative Whiteboard (#175, Phase 3) | **Confirms collab is needed eventually** |
| 35 | **Session persistence is key**: whiteboards from previous days are kept, so teacher can review what was covered in past classes. | Solo Whiteboard (#174) | **Must-have** |
| 36 | **Preply pain points**: (1) Can't see where student is scrolling. (2) Write mode resets every time, has to re-select from toolbar. | UX improvements over Preply | **Design requirements** |

Raw: `feedback/raw/2026-03-21-jordi-email-round6-whiteboard.txt`

**Course programs confirmation (same date):** Jordi replied "Me parece perfecto!" to our plan for extracting and structuring the curriculum data. No action needed.

## Feedback Round 7 (2026-03-22, email reply)

Source: Email reply to "problema detectado en la demo" thread. Attached example PDF.

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 37 | **Content variety over grammar drills**: Exercises shouldn't be grammar-only. Wants to upload photos, artwork, varied materials. Main teaching tool is presentations. "This matters more than grammar exercises that ChatGPT can easily generate." | Phase 2A: Material Upload + Content types expansion | **Strategic signal** |
| 38 | **Example PDF attached** (`Las_partes_del_dia_y_las_horas_v2.pdf`): AI-generated "parts of the day and hours" document. Visual, presentational style. Has errors (typo "sinco", garbled formula) but shows the direction he cares about. | Content type design input | **Analyzed** (issue #208 closed). Analysis: `plan/langteach-beta/jordi-pdf-analysis.md`. Conclusion: no existing content type can produce this; new `visualExplainer` type needed. Follow-up: #233 (prototype via freeText, P2) and #234 (full type + renderer, P3). |
| 39 | **Whiteboard not urgent**: Will keep using Preply's, wants to explore Miro to give better feedback later. | Solo Whiteboard (#174) | **Confirms deprioritization** |

Raw: `feedback/raw/2026-03-22-jordi-email-materials-variety.txt`
PDF: `feedback/raw/2026-03-22-jordi-pdf-partes-del-dia.pdf`

## Feedback Round 8 (2026-03-28, voice note via Robert)

Source: WhatsApp voice note from Jordi, forwarded by Robert via email. ~23 seconds.

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 40 | **Grammar explanation support**: Platform should help teachers explain specific grammar concepts (e.g., ser vs. estar). Level-aware pedagogical explanations the teacher can reference or present to students. "Que pudiera ayudar al profesor a explicar determinados conceptos gramaticales." | Phase 2A: Teacher Workflow. Could leverage existing CEFR level rules + AI to generate level-appropriate grammar explanations on demand. | **New, actionable** |

Raw: `feedback/raw/2026-03-28-jordi-audio-grammar-explainer.txt`

## Feedback Round 9 (2026-03-29, voice note via Robert — answer to Isaac)

Source: WhatsApp voice note from Jordi, forwarded by Robert via email. Response to Isaac's question about his typical work day (Tuesday). ~9.5 minutes.

### Daily workflow revealed

- Works 7 days/week. Online via Preply (27 students, 35-40 classes/week) + in-person at private academy (group classes, B1.1 + starting A2.1, 2h each, 6-8pm).
- Morning routine (8-9am): check for cancellations, upload material to Preply, review Excel tracker for each student's next session.
- During class: takes paper notes (errors, topics for future classes). Transfers to Excel after. "I'm disorganized and don't always do it."
- Afternoon: siesta, then 4:30-6pm prep for 6pm group class. Structured prep: warm-up, activity 1, 2, 3. Prints everything. Sets whiteboard (date + activity list + interesting phrase/proverb).
- Saturday morning (no classes): main planning day. Tries to prep all 4 group sessions (B1.1 x2, A2.1 x2). "Normally don't manage to finish."
- Sunday: catch-up planning for anything not done Saturday.

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 41 | **Excel replacement is a direct ask**: "The Excel is quite rough — I don't know if you can help me with that." 27 students, 35-40 classes/week. The Excel = per-student log of what was done, what to do next. | Core product value. Validates Round 5 #26 ("organization over AI"). LangTeach IS the replacement. | **Reinforced with direct request** |
| 42 | **Post-class audio notes confirmed for 3rd time**: Paper notes during class → transfer to Excel is the pain. "Post-class follow-up is very, very, very important and I could use help there." Explicitly references sending audio like this note. | Phase 2A: Audio Reflections | **Strong reinforcement** |
| 43 | **Warm-up is NOT lesson-content**: 5 min, open conversation, not related to what they're studying. Goal: get students speaking Spanish. Varies by group energy. Must start on time (6:05 sharp). | Already fixed in #226. Good confirmation the fix aligns with reality. | **Validation** |
| 44 | **Error management per student, not per nationality**: Explicitly says errors differ within a nationality — some struggle with verbs, others with pronunciation. Wants: "from this error, how can the student improve." | Phase 2A: Enhanced Difficulty Tracking (#100) | **Reinforces with concrete framing** |
| 45 | **Scale data**: 27 online students, 35-40 classes/week, 2 group classes (B1.1 + A2.1 starting). Saturday = sole planning window, often insufficient. | Confirms the prep-time pressure is extreme. Speed and reduced clicks matter enormously. | **Context** |

Raw: `feedback/raw/2026-03-29-jordi-audio-daily-workflow.txt`

## Feedback Round 10 (2026-03-29, voice note via Robert — WA0004)

Source: WhatsApp voice note from Jordi, forwarded by Robert via email (msg #33). Exercise pedagogy.

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 46 | **Inductive/discovery pedagogy**: Jordi's approach is: give context (text or audio) → student notices the structure → student discovers the rule. NOT: explain grammar → drill. Activities include dynamics, not just fill-in-the-gap. "Que sea el propio alumno que descubra lo que hay detrás." | Phase 2A: Content generation. Isaac confirms this is mainstream ELE (noticing hypothesis / PCIC "observa y reflexiona" sequences). | **New pedagogical signal** |
| 47 | **Noticing tasks and reflection prompts as first-class activity types**: The platform should generate: (1) input text/audio with target structure, (2) guided noticing task ("subraya los verbos en pasado"), (3) reflection prompt ("qué observas"), (4) controlled practice. | Phase 2A: Content types expansion (new block types: noticingTask already exists — verify if it covers this) | **New exercise taxonomy signal** |

Raw: `feedback/raw/2026-03-29_jordi_whatsapp_WA0004_exercise-pedagogy.txt`

## Feedback Round 11 (2026-04-03, voice note via Robert — WA0009)

Source: WhatsApp voice note from Jordi, forwarded by Robert via email (msg #34). Audio/listening comprehension. Jordi asked this be shared with both PM and Isaac.

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 48 | **Audio comprehension materials gap**: Harder to find good audio activities than text. Wants: teacher supplies audio URL/file → AI generates pre/while/post-listening activity sequence around it. Prefers real audio (authentic interviews, 3-4 min). | Phase 2A: Material Upload enhancement. Platform generates activity wrapper around teacher-supplied audio. | **New, actionable** |
| 49 | **Listening activity type diversity**: Beyond T/F and gap-fill: global comprehension summary, selective listening, inference tasks, language focus noticing within audio, discussion/debate launch from audio. Isaac validates all of these as documented ELE methodology. | Phase 2A: Content types. Activity variety around listening input. | **New detail** |

Raw: `feedback/raw/2026-04-03_jordi_whatsapp_WA0009_audio-comprehension.txt`

## Feedback Round 12 (2026-04-05, demo meeting — recording)

Source: ~48 min video call Robert + Jordi. Robert showed the app with Jordi's Excel data imported. Transcript: `feedback/raw/2026-04-05_jordi_robert_meeting_demo-review.txt`

### Key reactions

- "Está muchísimo mejor que el Excel visualmente" — confirmed visual improvement
- BUT: "Me tiene que ahorrar tiempo. Tengo 5 minutos entre clase y clase." — usage depends on speed
- Voice input is the unlock: "En voz me ahorra muchísimo tiempo porque escribo muchísimo más información en voz."
- Still sees it as "Excel with better UI" until voice + lesson generation + materials are connected

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 50 | **Student profile basic fields missing**: Wants: age, profession, where they live, native language, other languages spoken, why studying Spanish. These are the 5-6 mandatory fields. | Student profile enrichment. Partially in existing profile, but some fields missing. | **New, actionable** |
| 51 | **Two-level CEFR**: (1) Official test result (Preply), (2) Teacher's own assessment. Both visible. "Preply dice A2 pero yo creo que es B1." | Student profile field enhancement | **New, actionable** |
| 52 | **Short-term objective with date**: Time-bounded goal field ("viajo a Madrid en 3 meses", "reunión de negocio en 2 semanas"). Different from long-term learning goals. Isaac: changes content priority, methodology (role-play simulations), urgency ordering of grammar. When active + deadline within 6 weeks, inject with higher weight in generation. | Phase 2A: Student profile + generation. Micro-ESP constraint on general CEFR syllabus. | **New, actionable** |
| 53 | **"Ideas para próximas clases" teaching to-do list**: Structured list per student: topics/grammar to cover. Markable as "done/covered" (not deleted). Separate from general notes. Isaac: "done" = covered in teaching, not mastered — consider surfacing for spaced review. | Could extend current difficulties section or session log area. | **New, actionable** |
| 54 | **Student list: last class date + session count**: Show these in the student list view. Tells teacher which students are dormant. Sort by last class, session count, rate. | Student list UX enhancement | **New, actionable** |
| 55 | **Student rate/fee field**: For prioritization. "A veces me interesa ordenarlos por tarifa." Not necessarily displayed publicly. | Student profile field + list sort | **New** |
| 56 | **Cancelled session logging**: Log "planned but cancelled" — keep the planned content (topic/activities) even when session didn't happen. Teacher can pick it up next time. | Session log enhancement | **New, actionable** |
| 57 | **Notes field separation**: Current notes mix personal info (has kids, health issues) + teaching observations. Should be separated. | Student profile UX | **New** |
| 58 | **Difficulty tracker: structured taxonomy + mark-as-done**: Categories by competency (Grammar, Vocabulary, Pronunciation, etc.) > subcategory (ser/estar, subjunctive). Items markable as "covered." Isaac suggests spaced review surfacing rather than permanent removal. | Extends #188 (current sprint) | **New detail** |

Raw: `feedback/raw/2026-04-05_jordi_robert_meeting_demo-review.txt`

## Feedback Round 13 (2026-04-06, live app walkthrough with real students)

Source: 44-minute video call. Jordi used the app for 6 back-to-back real classes. Live screen share showing student list, profiles, and session cards. Transcript: `feedback/raw/2026-04-06_jordi_robert_call_app-walkthrough.txt`

### General mood

Positive and actively engaged. "Me ha gustado." First day using it with real students. Still sees it as "Excel with better UI" but is invested in making it work. Gave very concrete, workflow-grounded feedback.

### Key workflow insight (not a feature request, a mental model)

**Jordi does not create future sessions in advance.** He works on the last session: logs what happened, notes what to do next, and comes back to those notes when the next class arrives. The "next session" only exists as a note inside the current session, not as a separate card. The app's model of "each box is a session" is technically correct, but the UX needs to meet him where he is -- the `NextSessionTopics` field on the current session IS his next-class plan, and it must be prominent and actionable.

### New feedback items

| # | Feedback | Roadmap fit | Status | Issue |
|---|----------|-------------|--------|-------|
| 59 | **Student active/inactive status + filter**: Mark current vs former students. List defaults to active only, filterable. | UI Modernisation | New | #576 |
| 60 | **Corporate student flag**: Boolean field for students paid by their employer. Simple boolean for now. | UI Modernisation | New | #577 |
| 61 | **Student list search box**: Magnifying glass / lupa to find a student by name. | UI Modernisation | New | #578 |
| 62 | **After saving student, redirect to profile**: Currently redirects to list. Should stay on the student's profile page. | UI Modernisation | New (UX bug) | #579 |
| 63 | **Session form: confirm before closing if unsaved changes**: Jordi lost data by clicking outside the form. | UI Modernisation | New (UX bug) | #580 |
| 64 | **Show NextSessionTopics on session card**: Backend field exists. "What I planned for next class" should be visible and distinct on the session detail view. | UI Modernisation | New | #581 |
| 65 | **"Start next session" button**: From the last session card, one click creates the next session pre-populated with NextSessionTopics as the planned content. | UI Modernisation | New | #582 |
| 66 | **Learning Goals: hierarchical structure**: Category (Business, Pronunciation, etc.) + free text description. Current flat tag list doesn't match how Jordi thinks about goals. | UI Modernisation | New | #583 |
| 67 | **Teaching Context field goes unused**: He puts everything in Notes. The field design needs rethinking. | Deferred observation | Logged | - |

### Items that reinforce existing issues

| Existing | Reinforcement |
|----------|--------------|
| #525 (basic info fields) | Country of origin, city, current location, other languages -- reinforced with specifics: origin vs current location is important; city matters more for Spain-based students |
| #531 (rate/tarifa field) | Strong reinforcement. Jordi mentioned it 3 times. Confirmed: open list with autocomplete, currency-agnostic (free text "12 euros") |
| #530 (last class + session count on list) | Reinforced |

### Preply post-class AI report (observed, no action)

Jordi showed a Preply post-class AI report (lesson summary, vocabulary, errors, speaking time ratio). His take: interesting but "todo este tocho no se lo puede decir al alumno -- es demasiado jargón." He wants the AI insights for himself, not to share with students. Confirms direction for AI session analysis, but output should be teacher-facing and actionable, not verbose.

Raw: `feedback/raw/2026-04-06_jordi_robert_call_app-walkthrough.txt`

## Feedback Round 14 (2026-04-09, two voice notes via Robert)

Source: Two WhatsApp voice notes forwarded by Robert via email (msg UIDs 506 and 507), evening of 2026-04-09.

| # | Feedback | Roadmap fit | Status |
|---|----------|-------------|--------|
| 68 | **Topic notes surfacing ("ideas para proximas clases" mechanism)**: When things come up mid-class ("tengo que trabajar pronunciacion con este", "diferencia articulo determinado/indeterminado"), he wants to jot them as forward-looking notes. Problem with current flow: tagging them to a session makes them disappear as newer sessions bury them; putting them in the student profile feels wrong because they emerge from classes, not from onboarding. Wants a surface that highlights these the same way the "color resalta para la proxima clase" already does. Can be attached to a session AND surface on the student history/profile. | Directly validates the "ideas para proximas clases" feature in the current sprint story. Strong reinforcement of Round 12 #53. Confirms: the field must live on the student as an accumulating list, visually prominent, even though entries are captured during a session. | **Reinforced** (Round 12 #53) |
| 69 | **Session date should default to today**: Don't require typing the date every time a session is created. | Current sprint: student profile / session log polish | **New, actionable** |
| 70 | **Session date should accept 2-digit year**: Allow "26" instead of requiring "2026". | Current sprint: form UX polish | **New, minor** |
| 71 | **BUG, URGENT: cannot create a new session ("no puedo crear nuevas clases")**: The only button visible is "Start next session" / "New next session" and clicking it appears to overwrite the previous session instead of creating a new one. He wants to create the session for April 19, cannot. Explicitly flagged as the most important item: "mira sobre todo lo ultimo, por favor." Likely regression from #582 (Round 13 #65): "Start next session" flow replacing vs creating. | Hotfix candidate. Blocks Jordi's actual workflow. | **URGENT, needs repro** |

Raw:
- `feedback/raw/2026-04-09_jordi_whatsapp_WA0005_topic-notes-visibility.txt`
- `feedback/raw/2026-04-09_jordi_whatsapp_WA0000_session-date-and-create-bug.txt`

Note: Per feedback_reply_before_acting, do not create issues for #68-#70 yet. Reply with summary + planned issues, wait 4 days. Item #71 is a blocker bug and should be investigated and fixed on a hotfix branch regardless of the 4-day rule.

## Open items (internal, do not chase Jordi)

- ~~Awaiting: course programs for all levels~~ RECEIVED
- ~~Awaiting: "systematization" PDF example~~ RECEIVED
- Book index photos (mentioned in call, may be covered by grammar content maps). If they arrive, great. If not, we have enough.
- Gemini infographic errors: potential use case for our generation quality. Observe if he mentions it again.
- Activity types he uses most: observe from future interactions, don't ask directly.
