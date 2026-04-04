# Sprint: Adaptive Replanning

## The teacher's story

Ana finishes a session with Marco. She opens LangTeach, taps "Log session," and types a quick note: "We got stuck on ser/estar in the preterite. He kept defaulting to Italian 'essere'. Didn't get to the production exercise — ran out of time. Next time: more drilling on ser/estar past, revisit the role-play we skipped."

She saves it in under a minute.

Next week, Ana opens Marco's lesson editor and clicks Generate. The AI already knows what happened last week. The warm-up skips the icebreaker and goes straight to a short ser/estar recall exercise. The practice section picks up exactly where they left off. The production section includes the role-play Marco missed. Ana doesn't have to explain any of this — the system remembered.

That's the sprint.

## What changes for Ana

Before this sprint: Ana logs sessions manually. The log is stored and visible, but it doesn't feed back into generation. She still has to mentally reconstruct "what did we cover last time" every time she generates a new lesson.

After this sprint: the session log becomes an active input. When Ana generates a lesson for a student who has session history, that history shapes the output — previous topics, open items, what was skipped, teacher observations. The AI adapts without Ana having to re-type anything.

## The two loops this closes

**Loop 1: Session → Generation**
Session log entries (planned content, actual content, homework, topics for next session, general notes) are injected into the AI generation context. This was built in the previous sprint. This sprint makes it *felt* by Ana: the output visibly reflects what she logged, not a generic B1 lesson.

**Loop 2: Session → Student profile**
When Ana flags a difficulty in a session ("confuses ser/estar in past tense"), that difficulty propagates automatically to the student's difficulty list. The next generation then targets it without Ana having to go update the profile separately. One action, two effects.

## The voice note path (P1)

Jordi's dream: finish class, open WhatsApp, record a 30-second voice note, done. The system transcribes it and extracts the session observations.

This sprint delivers the infrastructure for that: audio recording in the browser, upload to blob storage, Whisper transcription, structured extraction of session fields from the transcript. The UI wraps it in the existing Log Session dialog — a microphone button next to the text fields. Teacher can use voice or text; both produce the same structured session log.

## Course replan suggestions (P1)

After 3-4 sessions, Ana sees a banner on Marco's overview: "Based on recent sessions, consider adjusting the next 2 lessons to reinforce ser/estar past tense before moving to object pronouns."

The AI looks at recent session logs, compares actual coverage to the planned curriculum progression, and surfaces a concrete suggestion. Ana can accept it (one click, the next lesson's topic and focus adjust) or dismiss it. No manual replanning required.

## What we're NOT building

- Full audio pipeline with streaming transcription (batch Whisper is fine for this sprint)
- Automatic course restructuring without teacher approval (suggestions only, teacher confirms)
- Difficulty tracking UI beyond the existing weaknesses field (auto-population only)
- Group session support (single student only)

## How to use this document

This story is the sprint's north star. Every task, review, and test should be checked against it: **can Ana finish a session, log it in under a minute (voice or text), and see the AI adapt her next lesson without any additional input?** If a feature works technically but Ana's experience doesn't match this, it's not done.
