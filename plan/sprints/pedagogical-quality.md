# Sprint: Pedagogical Quality

## The teacher's story

Ana generates a lesson for Marco (Italian, B1, sports). The Practice section has three exercises: a matching drill on ser/estar with sports contexts, then an error correction exercise where Marco fixes sentences like "Yo soy muy calor" (his Italian L1 makes this mistake predictable), then a guided writing task: "Describe your morning routine in 5 sentences using ser and estar." Each exercise is harder than the last. By the time Marco hits Production, he's already practiced the structure three ways.

For her A1 student, Ana sees different exercises: word ordering ("en / vivo / Barcelona / yo"), matching (word to image), categorization (ser vs estar columns). No fill-in-blank without a word bank. The system knows A1 students can't produce from nothing yet.

In the Presentation section, before explaining the grammar rule, there's a short text with target structures highlighted. Marco reads it and answers: "Can you find two different past tenses? What do you think the difference is?" He notices the pattern before Ana explains it.

The grammar block for Marco includes a callout: "In Italian: 'sono stanco.' In Spanish: 'estoy cansado.' Tiredness is a state (estar), not identity (ser)." His L1 is an asset for understanding, not just a source of errors.

Every lesson has a Production section. Even at A1: "Write 3 sentences about yourself using today's vocabulary." At B2 DELE prep: "Write a formal complaint letter (120-150 words) using at least 2 conditional forms and formal register."

## What this sprint delivers

**New exercise formats (within existing Exercises content type):**
- Sentence ordering (A1-B1): scrambled words into correct syntax
- Error correction (A2-C2): find and fix L1-targeted errors, categorized by type
- True/false with justification (A2-B2): standard reading comprehension, quote the text
- Sentence transformation (B1-C1): rewrite with different structure, multiple valid answers

**New content types:**
- Guided writing: situation + required structures + word count + model answer (Production and Practice Stage 3)
- Noticing task: text with embedded target structures + discovery questions (Presentation)

**Practice scaffolding:**
- `stage` field on exercise blocks: `controlled`, `meaningful`, `guided_free`
- A1/A2: 2 stages. B1/B2: 3 stages. C1/C2: 2-3 stages (skip mechanical).
- Stage-to-exercise-type mapping hardcoded in prompts (AI doesn't choose freely)

**L1 contrastive notes:**
- Optional field in grammar blocks comparing target structure with student's L1
- Only generated when L1 is known and an interference pattern exists

## What we're NOT building

- Listening comprehension or audio generation (no audio infrastructure yet)
- Student-side interactivity beyond basic answer checking (Phase 3, student portal)
- Adaptive exercise difficulty within a session (Adaptive Replanning sprint)
- New section types in PPP (Practice stays one section with multiple staged blocks)

## Template vs description (same as before)

Templates control grammar sequence, competency focus, CEFR boundaries. The description controls scenarios and contexts. This sprint adds: templates also control which exercise formats and scaffolding stages are appropriate per level.

## How to check if it's done

Can Ana generate a B1 lesson where Practice has three visibly different exercise types progressing from mechanical to semi-free? Does an A1 lesson avoid fill-in-blank? Does the grammar block show an L1 comparison for Marco's Italian? Does every lesson have Production? If yes, the sprint delivered.
