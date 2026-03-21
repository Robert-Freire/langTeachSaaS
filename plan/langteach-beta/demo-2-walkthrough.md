# Demo Walkthrough (Jordi, 2026-03-21)

**Framing to open with:** "I want to show you where the app is so your feedback is grounded in what actually exists, not what I describe."

## Flow

1. **Dashboard** - Start here. Show the week strip, quick actions sidebar. "This is what a teacher sees when they log in."

2. **Students** - Open the list, click into a student. Show the profile: CEFR level, interests, native language, weaknesses. "This is what the AI uses to personalize."

3. **Create a Lesson** - From dashboard or lessons list, pick a template (Conversation is the most visual). Assign it to a student. "Notice it picks up the student's level and language automatically."

4. **Generate** - Hit Generate All. Let it stream in real time. Don't rush this, let him watch. "This is the part that replaces 15 minutes of prep."

5. **Typed Content** - Scroll through the generated sections. Point out: vocabulary is a table (not text), exercises are interactive (not a list), conversation is a dialogue card. "Same data, different rendering depending on context."

6. **Study View** - Click "Preview as Student." Same lesson, student experience: flashcards, interactive quiz, dialogue viewer. "Teacher and student see the same content, different interface."

7. **Regenerate** - Go back to editor. Pick one section, add a direction ("make it about food instead of travel"), regenerate just that section. "The teacher stays in control."

8. **PDF Export** - Download the PDF. "Teacher copy has answers, student copy doesn't."

9. **Hand him the keyboard.** "Click around. What would you try to do? Where do you get stuck?"

## What NOT to show (unless he asks)
- Profile/settings (boring)
- Mobile view (show on laptop)
- Empty states (start with seed data)

## What to listen for
- What does he try to click that doesn't exist yet?
- Does he ask about courses/curriculum? (validates Phase 2 priority)
- Does he mention specific content types he'd want? (feeds typed content roadmap)
- Does he try to do something the app doesn't support? (that's the most valuable signal)

---

## Demo Seed Data: Spanish Class Example

Use this data when creating the demo student and lesson live during the walkthrough.

### Student

| Field | Value |
|---|---|
| Name | Carlos Mendez |
| Learning Language | Spanish |
| CEFR Level | B1 |
| Native Language | English |
| Interests | travel, cooking, football |
| Learning Goals | hold conversations with native speakers, order food and ask for directions, talk about past experiences |
| Weaknesses | ser vs estar, subjunctive mood, rolling the R |
| Notes | Works in logistics, travels to Spain twice a year. Motivated but inconsistent with homework. Responds well to real-life scenarios. |

### Lesson

| Field | Value |
|---|---|
| Template | Conversation |
| Topic (notes field) | Ordering food and asking for recommendations at a restaurant in Madrid |
| Student | Carlos Mendez (auto-filled from above) |
| Level | B1 (auto-filled) |
| Language | Spanish (auto-filled) |

### Regenerate section demo

When demoing the regenerate step (step 7), use this direction on the Practice section:

> "Make it about asking for directions to a football stadium instead of ordering food"

This keeps it realistic and shows the AI picks up the student's interest in football.
