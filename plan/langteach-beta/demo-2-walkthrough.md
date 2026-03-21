# Demo Walkthrough (Jordi, 2026-03-21)

**Framing to open with:** "I want to show you where the app is so your feedback is grounded in what actually exists, not what I describe."

---

## Step 1: Dashboard

**What to do:** Start here. Show the week strip, quick actions sidebar.

**Say:** "This is what a teacher sees when they log in. Upcoming lessons for the week, quick actions on the side."

---

## Step 2: Create the Student

**What to do:** Go to Students, click "New Student." Fill in these fields exactly:

| Field | Type this |
|---|---|
| Name | `Willem van der Berg` |
| Learning Language | `Spanish` |
| CEFR Level | `B1` |
| Native Language | `Dutch` |
| Interests | `rugby, art and painting, travel, sailing` |
| Learning Goals | `hold conversations with colleagues in Spanish ports, talk about art and culture, describe his work and daily routines` |
| Weaknesses | `ser vs estar, gender agreement, prepositions (por vs para)` |
| Notes | `Ship captain, travels to Spanish-speaking ports regularly. Also speaks French and English. Highly motivated, limited study time due to work schedule. Responds well to practical, real-world scenarios connected to his profession and interests.` |

**Say:** "This is a real profile: Dutch, ship captain, loves rugby and art, speaks French and English. Everything here feeds into the AI. Watch how it uses this."

**Why this student:** Jordi described this exact student in his last email. He'll recognize it immediately.

---

## Step 3: Create a Lesson

**What to do:** Go to Lessons, click "New Lesson." Fill in:

| Field | Type this |
|---|---|
| Template | `Conversation` |
| Language | `Spanish` |
| CEFR Level | `B1` |
| Student | `Willem van der Berg` (select from dropdown) |
| Topic | `Visiting an art museum in Barcelona and discussing paintings with a local guide` |

**Say:** "I set the language and level, link the student, pick a topic. The AI will pull Willem's full profile (interests, weaknesses, native language) into the generation."

---

## Step 4: Generate

**What to do:** Hit "Generate All." Let it stream. Do NOT click anything else. Let Jordi watch the content appear section by section.

**Say:** "This is the part that replaces 15 minutes of prep. Watch."

**After it finishes:** "Every section was generated knowing Willem is Dutch, B1, interested in art. Look at the vocabulary: it's not generic B1 words, it's museum and art vocabulary tailored to his level."

---

## Step 5: Typed Content

**What to do:** Scroll through the generated sections slowly. Point at each one.

**Say for each:**
- **Vocabulary:** "This is a structured table, not a text dump. Each word has a definition, example sentence, and translation."
- **Exercises:** "These are interactive: multiple choice, fill-in-the-blank. Not a PDF list."
- **Conversation:** "This is a dialogue card with roles. Not raw text."

**Key line:** "Same data, different rendering depending on whether you're the teacher editing or the student practicing."

---

## Step 6: Study View

**What to do:** Click "Preview as Student" (or the study view button).

**Say:** "Same lesson, student experience. Flashcards for vocabulary, interactive quiz for exercises, dialogue viewer for conversation. Teacher and student see the same content, different interface."

---

## Step 7: Regenerate with Direction

**What to do:** Go back to editor. Click Regenerate on the Practice section. In the direction field, type exactly:

> `Change the scenario to arriving at a Spanish port and coordinating with harbor staff`

**Say:** "Watch this. I'm changing one section, keeping everything else. And I'm connecting it to his job as a ship captain."

**After it regenerates:** "The AI knows Willem is a captain. The new content references ports, crew, harbor vocabulary. The teacher stays in control of what to regenerate and what direction to take."

---

## Step 8: PDF Export

**What to do:** Click Export/Download PDF.

**Say:** "Two versions: teacher copy has answers marked, student copy doesn't. Ready to print or send via WhatsApp."

---

## Step 9: Hand Over

**What to do:** Give Jordi the keyboard (or share screen control on Meet).

**Say:** "Click around. What would you try to do? Where do you get stuck? What's missing?"

---

## What NOT to show (unless he asks)
- Profile/settings (boring)
- Mobile view (show on laptop)
- Empty states (start with seed data)

## What to listen for
- What does he try to click that doesn't exist yet?
- Does he ask about courses/curriculum? (validates Phase 2 priority, already built!)
- Does he mention specific content types he'd want? (feeds typed content roadmap)
- Does he try to do something the app doesn't support? (most valuable signal)
- Does he mention the Dutch student example? (confirms he recognizes his own use case)

## If he asks about courses

The Course Planner is already built (#98, shipped). If he asks "can I plan a full course for this student?", show it. This is a bonus moment, not part of the main flow.

---

## Pre-demo checklist

- [ ] App running and accessible via the URL you'll share on Meet
- [ ] Logged in, dashboard visible
- [ ] No existing "Willem" student (create it live during the demo)
- [ ] Audio recording running (phone voice recorder or Audacity)
- [ ] This script open on a second screen or printed
