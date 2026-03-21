---
name: Unnamed teacher feedback
description: Feedback from anonymous teacher contacts (Jordi's colleagues), mapped to roadmap
type: project
---

## Teacher A — Ludic/Games (original source)

- **Name:** Unknown
- **Relationship:** Colleague of Jordi, same academy area
- **Role:** Language teacher
- **Source:** Audio voice note forwarded by Robert (2026-03-19)

| # | Feedback | Roadmap fit |
|---|----------|-------------|
| 1 | Ludic/gamified activities: quick games at end of class. Especially needed for intensive daily courses (Friday fatigue). | Phase 2B or 3: new "game" content type |
| 2 | Uses videos, songs, interactive elements to break monotony in intensive courses | Validates richer content types |

Raw: `feedback/raw/2026-03-19_jordi_audio-round3_gamification.txt`

---

## Teacher B — Philologist (new source, 2026-03-20)

- **Name:** Unknown (anonymous, Jordi explicitly relays all questions — no direct contact per Robert's instruction)
- **Relationship:** Jordi's colleague from first summer at the academy (not most recent summer)
- **Role:** Language teacher, likely philologist / linguistics background
- **Source:** WhatsApp audios + text messages forwarded by Robert (2026-03-20)
- **Demo window:** Will be in Barcelona 2026-03-31 to 2026-04-05 — Jordi suggests showing him the demo then

### Feedback batch 2026-03-20

| # | Feedback | Roadmap fit | Priority signal |
|---|----------|-------------|-----------------|
| 1 | **Real-time class error capture**: During group class, AI listens and captures each student's errors in real time. End-of-class report per student with specific grammar/vocabulary failures + individual reinforcement activities. | Future (AI tutor territory). But the OUTPUT (per-student error report) aligns with Enhanced Difficulty Tracking (#100) — we can get the insight from teacher-entered notes even if real-time capture is future. | Very high value, too complex now |
| 2 | **Cultural/linguistic bridge for teachers**: In mixed-L1 groups, not translation for students but guidance for the TEACHER: "This student is Chinese, here's why they don't understand and how to rephrase." AI suggests culture-specific analogies. | Phase 2A: Fits inside Group Class Support (#101) — when generating group lesson, include teacher guidance per L1 background. Also extends existing L1 interference logic in prompts. | Strong, actionable in Phase 2A |
| 3 | **Level-constrained text generation**: Search or generate reading texts that match BOTH the topic AND the CEFR level (specific grammar allowed/forbidden). Teachers waste time finding appropriate texts. | ALREADY BUILT — our reading content type does exactly this. Teacher doesn't know it yet. Use in demo. | Validation, not a gap |
| 4 | **Bibliographic references for teachers**: When prepping, AI recommends articles/books on specific grammar topics to deepen teacher's own knowledge. | Phase 3 / Future: teacher professional development tool, not lesson prep. | Low urgency |
| 5 | **Content structurer**: Throw a list of lexical, grammatical, pragmatic topics and get them back in the most pedagogically logical order. Especially needed for 1-to-1 classes. | Phase 2A: This IS the Course Planner (#98) — curriculum sequencing is exactly this. Good validation. | Validation |
| 6 | **Textbooks as context**: Feed the system the textbooks used in class (by publisher/edition) so AI complements rather than conflicts with what they're already using. | Phase 2A: Extends Material Upload (#102). Post-upload, AI should reference it. Could be a profile-level setting. | Strong, achievable |
| 7 | **In-class vs. prep tools**: Explicitly asks whether the platform is for class prep or in-class use. Notes both are valuable. | Clarifies product scope — we're primarily prep-side for now, in-class is Phase 3+. Worth being explicit in UX. | Context |

Raw files:
- `feedback/raw/2026-03-20-anonymous-teacher-WA0000.txt`
- `feedback/raw/2026-03-20-anonymous-teacher-WA0001.txt`
- `feedback/raw/2026-03-20-anonymous-teacher-text.txt`
- `feedback/raw/2026-03-20-jordi-WA0002.txt` (Jordi contextualizing Teacher B)
