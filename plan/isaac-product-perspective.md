# A Teacher's Product Perspective
### What LangTeach needs to be — from the classroom out

*Written by Isaac (ELE teacher, EOI, 15+ years). Input for the PM to translate into product decisions.*

---

## The One Job

**A prep assistant that knows each student.**

The teacher spends 10 minutes instead of 30, and the material is better because it's actually personalized. That's the product. Everything else is infrastructure for that job or a future extension of it.

---

## The Current Reality (the pain this replaces)

A teacher doing 1-to-1 online classes has 5–8 students per day, each at a different level, each with different goals, different native languages, different weak points. Between classes there is rarely more than 15–20 minutes to prepare the next one.

Today that prep looks like this:

1. Try to remember what happened in the last class (often imperfect or wrong)
2. Decide what to cover today (a guess, usually conservative because guessing wrong wastes the class)
3. Find or create material (Google, a textbook, writing something from scratch, giving up and improvising)
4. Share it during class (screen share, WhatsApp a PDF, paste text in the chat)
5. After class: mentally note what happened, rarely write it down, move to the next student

The result: teachers spend real time on step 3 every single day, the material is often generic because there's no time to personalize, and step 5 almost never happens — which means step 1 next week is always imperfect.

The cumulative cost: a student's progress is tracked in the teacher's memory. When that memory is imperfect, the lesson is imperfect.

---

## What the Tool Does (in teacher language)

### Layer 1: It knows each student

The tool maintains a profile for each student that goes beyond name and level. It knows:

- CEFR level (and sublevel — there's a real difference between B1.1 and B1.2)
- Native language (because an Italian speaker's errors are different from an English speaker's)
- Goals (conversational fluency, exam prep, professional register, travel)
- Specific difficulties tracked over time (not a tag — a history: "has been confusing preterite and imperfect since October, showing improvement in last two sessions")
- Topics and vocabulary already covered, so nothing is repeated without intention
- What engaged them and what fell flat (if the teacher captures this)

This profile is not a form the teacher fills in once. It grows from use. Every class, every note, every generated exercise adds to it.

### Layer 2: It generates material that fits

Given a student profile and a topic or goal, the tool generates lesson material that is:

- At the right CEFR sublevel (not just "B1" — actual sublevel granularity)
- In vocabulary the student hasn't seen yet, or that revisits known vocabulary with a reason
- Sensitive to the student's L1 interference patterns (a Spanish teacher knows these; the tool should too)
- Relevant to the student's stated interests and goals
- Varied in exercise type — not always fill-in-the-blank

The teacher reviews, edits if needed, and uses it. That's the loop. The teacher's job is judgment, not production.

### Layer 3: It closes the loop after class

The teacher needs a zero-friction way to record what happened. Not a form. Not a structured input. Something like: drop three sentences, or a voice note, and the tool extracts what matters: what was covered, what the student struggled with, what to revisit. That record feeds Layer 1, which feeds Layer 2 for the next class.

Without this layer, the tool is a better worksheet generator. With it, it's a teaching memory.

---

## What the Tool Does NOT Do

**During class:** The tool is not used live during the lesson. The teacher prepares beforehand and teaches from that preparation. Adding a tool to manage mid-class increases cognitive load and breaks the class energy. The output of the tool (a PDF, a shareable exercise link) is what enters the classroom, not the tool itself.

**Scheduling and billing:** Teachers have tools for this. Entering that space means competing with Calendly, Stripe, and a dozen purpose-built apps. Stay out.

**Group classes (for now):** The entire value proposition is "it knows this specific student." Group classes require a different model. It's a future extension, not the foundation.

**Generic material:** A vocabulary list about "el transporte" that any B1 student could use is not the product. That's a textbook. The product is a vocabulary list about "el transporte" for Pedro, who works in logistics, whose L1 is English, and who last week confused "conducir" and "manejar" because of regional variation. That's personalization.

---

## What "Good" Feels Like

A teacher opens the app before a class with Ana. They see: last class covered preterite irregular verbs, Ana got most of them right but is still shaky on "ir" and "ser" (which share forms), and last week she mentioned she's planning a trip to Mexico City.

With two clicks the teacher has: a short reading text at B1.2 level set in Mexico City, a follow-up exercise targeting preterite irregulars specifically for "ir/ser", and a conversation prompt that lets Ana practice the grammar in a real context.

The teacher scans it, makes one small edit, and is ready. That took 8 minutes.

That's the product.

---

## Open Questions for the PM

These are things I can't answer from the classroom. The PM and the team need to decide:

1. **At what point does the student profile exist?** Does the teacher fill in an intake form when they add a student, or does the profile emerge entirely from generated content and post-class notes? The former requires more upfront effort; the latter requires more patience before the tool is useful.

2. **What is the minimum student knowledge for the first useful generation?** Level + L1 is probably enough to generate something better than generic. The question is whether that's compelling enough to retain a new teacher who hasn't yet built a rich profile.

3. **Who owns the post-class record?** Voice notes are a low-friction input method, but they require processing (transcription, extraction). Is that core to the Beta proposition, or is it Phase 2? If teachers have to type their notes, many won't. If they have to record an audio and wait for it to process, some won't. Friction here directly determines whether Layer 3 exists in practice.

4. **When does the homework loop become necessary?** Right now the tool generates material the teacher uses in class or shares informally. Students completing exercises and teachers seeing results (the closed homework loop) requires a student-facing interface. At what phase does the product feel incomplete without it?

5. **What does Jordi actually do today?** Before designing any of this: map his real week. Where does the time go, specifically? What does prep look like on a bad day vs. a good day? The answers will validate or invalidate every assumption in this document.

---

*This document reflects a teacher's view of what would change how I work. It is not a feature list — it is a description of a job to be done and what solving it well looks like. The PM should challenge any assumption here against Jordi's actual workflow.*
