---
name: Jordi Freire feedback log
description: Running log of feedback from Jordi (Robert's brother, language teacher, Head of Discovery) with status of each item
type: project
---

## Contact

- **Name:** Jordi Freire
- **Email:** jordim.freire@gmail.com
- **Role:** Language teacher, Head of Discovery for LangTeach (market research, teacher interviews, feedback gathering)
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

## Open questions for Jordi

- ~~Awaiting: course programs for all levels~~ RECEIVED
- ~~Awaiting: "systematization" PDF example~~ RECEIVED
- Awaiting: book index photos (mentioned in call, may be covered by grammar content maps)
- Why did the Gemini infographic have errors? (Could be a concrete use case for our generation quality)
- What types of games/activities does he use most? (Kahoot-style quiz, word match, fill-in-the-blank race?)
