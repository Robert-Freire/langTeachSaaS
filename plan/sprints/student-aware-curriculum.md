# Sprint: Student-Aware Curriculum

## The teacher's story

Ana teaches Spanish to private students. She has Marco, Italian, A1, moving to Barcelona next year. And Clara, German, B2, needs Spanish for her job in a law firm.

Ana opens LangTeach and types: **"A1, relocating to Barcelona, daily life situations, 12 sessions."** She picks Marco. The system generates a 12-session course.

Each session follows the A1 curriculum progression: greetings and "llamarse" first, then gender and high-frequency irregulars (ser, tener, ir), then the regular present tense conjugation pattern (-ar, -er, -ir), then additional irregulars. That sequence comes from a real academy curriculum (Instituto Educativo Espanol data, with unit-level grammar, communicative functions, and vocabulary themes). It doesn't change for Marco. It's the pedagogical backbone.

Note: key irregulars come before regulars because you cannot hold a single meaningful conversation without ser, tener, and ir. This matches the PCIC inventory and standard ELE textbook sequencing (Aula Internacional, Gente Hoy).

What changes is the context of every exercise.

Session 1 covers greetings and numbers. Marco's exercises are set in a registration office in Barcelona: telling the clerk his name, his phone number, understanding "planta tercera, ventanilla dos." Session 5 covers daily routines and telling time. Marco's exercises describe his morning in a shared flat in the Eixample: asking his flatmate when the supermarket closes, describing his commute on L3. Same grammar as any A1 student. Marco's life as the setting.

Ana sees each session's learning targets before generating a single lesson: **"Grammar: present tense regular -ar/-er/-ir. Communicative: describing daily routines. Vocabulary: daily activities, time expressions."** These come from the curriculum template, not the AI. If Marco's mother asks what he's learning this week, Ana answers in 5 seconds.

Now Clara. Ana types: **"B2, formal legal Spanish, written communication, 8 sessions."** She adds a note: "Struggles with subjunctive in formal register. Hates role-play."

The B2 progression is set: relative clauses, passive voice, subjunctive with opinion verbs, conditional structures. Three things adapt around it:

1. **Context.** Exercises use legal scenarios: drafting motions, writing to opposing counsel.
2. **Emphasis.** Subjunctive gets extra weight across multiple sessions because Ana flagged it.
3. **Constraints.** No role-play. Written exercises, reading comprehension, text analysis instead. (The system warns Ana that removing oral interaction from multiple sessions creates a speaking competency gap per CEFR requirements. Ana acknowledges and proceeds, because Clara's priority is written legal communication.)

The curriculum is fixed. The context is personal.

A few more things Ana can count on: if she assigns Marco to Clara's B2 course by mistake, the system warns her. If the AI generates an exercise that needs an audio clip that doesn't exist, the system flags it before class. If a B1 lesson contains C1 grammar, the system catches it.

## How template + description work together

| Template controls (fixed) | Description controls (personal) |
|---|---|
| Grammar sequence and progression | Scenarios and situations for exercises |
| Communicative functions per unit | Which real-life contexts illustrate those functions |
| Vocabulary theme categories | Specific vocabulary within those categories |
| Competency focus per session (CE, CO, EE, EO) | Nothing. The template sets the skill distribution. |
| CEFR level boundaries | Nothing. The template sets the boundaries. |

Additional inputs: student profile (native language, difficulties, interests), teacher notes (constraints, focus areas), session count (optional, defaults to template unit count).

## What we're NOT building

- Curriculum rearrangement by topic. The progression is fixed. The description adapts content within units, not between them.
- Free-form curriculum without templates. The templates are the backbone.
- Material upload. The system flags missing resources, but file uploads are a separate milestone.

## How to use this document

This story is the sprint's north star. Every task, review, and test should be checked against it: **can Ana do this yet?** If a feature works technically but Ana's experience doesn't match this story, it's not done.
