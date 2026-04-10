# Stitch prompt approach — Dashboard redesign

> Companion to `dashboard-redesign-isaac-notes.md`. This doc covers how to
> brief Stitch (or any visual generator) to produce the dashboard layouts,
> and proposes the example data cohort to use inside the prompts.

## 1. Approach principles (short version)

From Isaac's advice, condensed. Full reasoning in the prior conversation.

1. **Anchor the tone visually.** Always cite Linear / Superhuman as the
   density reference. Explicitly reject Notion, Duolingo, and "SaaS
   marketing" aesthetics.
2. **Real data, not placeholders.** Stitch infers typographic hierarchy
   and layout from the data examples you provide. Generic placeholders
   produce generic cards.
3. **One prompt per zone.** Don't ask for the whole dashboard in one
   shot. Generate separately:
   - Next session hero
   - Today's schedule strip
   - Pendientes / followups panel
   - Active students list
   And assemble afterwards.
4. **Explicit "do NOT" list.** Block the default SaaS tropes by name:
   progress bars, gamification badges, student count cards, "X lessons
   this week" counters, illustrated empty states, gradient cards.
5. **Terminology anchoring.** Define "Session" = past or planned class.
   "Lesson" = AI-generated content, NOT on this page. Spanish pedagogical
   vocabulary stays in Spanish ("subjuntivo", "pretérito indefinido").
6. **Viewport and density.** Desktop-first 1440×900, sidebar 240px fixed,
   main area uses full remaining width. 25 active students must fit with
   minimal scrolling.
7. **Two-pass generation.** Pass 1: wireframe + hierarchy, no final
   styling. Pass 2: refine with LangTeach palette (indigo primary, zinc
   grays, Inter).
8. **Reuse the ASCII sketch from the notes doc** directly inside the
   prompt. Stitch parses ASCII wireframes well.
9. **Feel like an ELE tool, not a generic teacher tool.** Mixed L1s,
   realistic CEFR spread, notes that sound like a real profesor ELE,
   not a textbook.

## 2. Privacy decision — required before prompts can be written

The cohort below is drawn from Jordi's real student spreadsheet
(`feedback/raw/2026-04-05_jordi_Alumnos actuales (1).xlsx`). These are
real people, and the notes contain sensitive details — one student has
medical concerns, another has financial difficulties, names and L1
combinations are individually identifying.

**Stitch is a Google product.** Anything we paste into its prompt box
gets sent to Google's infrastructure, is almost certainly used to
improve the model, and may be retained indefinitely. This is very
different from data inside our repo.

**Three options, Robert decides:**

| Option | What it means | Pros | Cons |
|---|---|---|---|
| **A. Real data as-is** | Paste real names + notes into Stitch | Maximum fidelity; Jordi will recognize the output immediately | Sends real student data to Google. Not acceptable under GDPR without Jordi's consent. Don't do this. |
| **B. Pseudonymized** (recommended) | Replace first names with realistic substitutes matching L1 (Italian → Italian name, Russian → Russian name). Keep level + L1 + short realistic notes that are inspired by the real patterns but don't contain identifying specifics. | Preserves the "feels ELE-real" quality; safe to share externally; future-proof | Slightly less authentic than real data |
| **C. Generic** | Invent names and notes from scratch, no connection to Jordi | Zero privacy risk | Loses the pedagogical realism that is the whole point of using Jordi's data |

**My strong recommendation: Option B.** The realism comes from the
*patterns* (mixed L1s, scottish learner on a boat, engineer with a
teenager, Arabic + German L1 combination, A1 struggling specifically
with verb desinencias, shy student who needs to talk more), not from
the exact names. I can preserve 100% of the pedagogical signal without
any identifying data.

## 3. Proposed cohort (Option B — pseudonymized)

Drawn from patterns observed in Jordi's spreadsheet, not the raw data.
If you approve Option B, this is what goes into the Stitch prompts.

| Pseudonym | Level | L1 / context | Recent focus (sample) | Last session notes (sample) |
|---|---|---|---|---|
| **Ewan McLeod** | A1.2 | Scottish, English native, works on a ship currently in Turkey | Verbs in present tense, ser/estar/hay | "Trabajamos ser/estar/hay. Le cuesta con 'hay' para existencia. Deberes: ejercicios 4d del A1 Latinoamérica." |
| **Bruno Almeida** | B1.2 | Brazilian, lives in Porto | Past tenses, free conversation on politics | "Cancelled last session. Before that: relaxed on political topic, good fluency, struggles with indefinido vs imperfecto." |
| **Elena Volkov** | B1.1 | Russian, telecom engineer, lives in Barcelona | Pretérito indefinido vs imperfecto, ser/estar | "Worked on imperfecto. She's shy about speaking. Promise: send exercises on bajaba/bajé contrast." |
| **Amani Haddad** | A1.1 | German passport, L1 Arabic, also speaks English. Living in Germany | Present tense verbs, infinitive vs conjugated forms | "Reviewed A1.1. She says verbs feel too hard. Need to slow down on desinencias. Homework: none — don't overload." |
| **Nadia El Amrani** | A2.1 | Moroccan, living in Paris | Descripción física, dialogues | "Good with present, poor vocab. Promised feedback on her redacción describing 3 friends. Haven't sent yet — 3 days ago." |
| **Kevin Brown** | A2.2 | American, hobbies focus | Direct object pronouns, menu/ordering vocabulary | "Did the A Comer audios. Homework: escribir las formas de pedir. I owe him an audio from Paco." |
| **Oksana Petrenko** | B1.1 | Ukrainian, shy, needs speaking practice | Reading comprehension, verb gustar | "Spoke much better today. Need to send her the gustar explanation + exercise. Goal: push her to book the exam." |
| **Paula Moretti** | B2.1 | Italian, nutritionist | Ser/estar/hay + OD/OI pronouns | "New student. First session went well, she recorded an audio for a colleague. Promised to confirm the new rate." |
| **Rona Díaz** | B1.1 | Romanian | Past vs present confusion, verb decir | "Did ser/estar/hay fill-in. Homework in the Drive folder. She cancelled twice recently — check engagement." |
| **Sandra Okafor** | A2.1 | Nigerian, interested in food/culture | Comparativos, restaurant vocabulary, verb poner/traer | "Restaurant vocab done. Next: seguir con poner/traer + gustar." |
| **Michael Chen** | A1.2 | Australian | Género, presente, desinencias | "Didn't do previous homework. Reviewed teoría and dado exercise. Suggested units 1-3 of Aula Internacional +." |
| **Matteo Russo** | C1.1 | Italian, film student | Advanced writing, subjuntivo en concesivas | "Struggled with subjunctive in concessives. Promised by/para exercises. Homework: redacción 'mi ciudad ideal'." |

12 students — more than we strictly need, but having spares lets the
"active students list" in the dashboard prompt show variety without
feeling padded.

### Cohort design rationale

- **L1 diversity:** English (2 variants), Portuguese, Russian, Arabic,
  French/Arabic, Italian (2 variants), Ukrainian, Romanian, Nigerian,
  Australian, Chinese. Matches Jordi's real spread: mostly European +
  scattered global.
- **Level distribution:** 4 × A1/A2, 5 × B1, 2 × B2, 1 × C1. Weighted
  toward lower intermediate which is where the volume is.
- **Name lengths:** includes short ("Nadia"), medium ("Elena Volkov"),
  and long ("Sandra Okafor"). Tests layout text-wrapping.
- **Context variety:** professional (engineer, nutritionist, film
  student), unusual situations (ship worker), regular expats. Matches
  the "every ELE student has a story" reality.
- **Pedagogical realism:** every note is a real pattern from Jordi's
  data, just rewritten. Every "promise" / "pendiente" is something a
  real ELE teacher actually owes.

## 4. Next steps

1. **Robert approves or rejects Option B** (or chooses a different
   cohort shape).
2. Assuming approval, I then write, into `stitch-redesign-prompts.md`,
   a new section with:
   - A shared context block (cohort, terminology, tone, do-NOT list)
   - One prompt per dashboard zone (4 prompts)
   - One prompt per secondary screen (ficha de alumno, lista de
     sesiones, crear sesión — 3 prompts)
3. Robert runs them in Stitch and brings back the generated mocks.
4. Isaac reviews the mocks pedagogically (names fit, notes fit,
   hierarchy emphasizes the right things, nothing feels like an LMS).
5. We iterate.

## 5. Open questions for Robert

- **Cohort option:** A, B, or C? (strong recommendation: B)
- **Stitch output target:** full-fidelity polished mockup, or
  structural wireframe first? I recommend wireframe first (principle
  7), but Stitch leans polished by default, so we must ask explicitly.
- **Secondary screens included:** dashboard only, or dashboard +
  student detail + session list + create-session form in the same
  batch? More screens = more iteration time, but consistency is
  easier if generated in one session with the shared context block.
- **Language of the UI in the prompt:** English UI labels with
  Spanish content (like the current product), or fully Spanish UI?
  Current product is English UI.
