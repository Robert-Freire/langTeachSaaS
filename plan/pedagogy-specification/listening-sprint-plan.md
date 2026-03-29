# Listening Comprehension Sprint (Draft Plan)

**Date:** 2026-03-28
**Status:** Early planning (post-Pedagogical Quality)
**Reviewed by:** Isaac (pedagogy), Sophy (data model), Arch (architecture)

## Why This Sprint

Isaac's assessment: listening comprehension is **the biggest competency gap** in the platform. Listening is 25% of every DELE exam and ~20% of EOI class time. Teachers plan 1-2 listening activities per session. Without audio, an entire CEFR competency is absent.

7 exercise types are blocked by missing audio infrastructure (CO-01 through CO-07, plus CO-08 which also needs video).

## Exercise Types Unlocked

| ID | Name | CEFR | What It Needs |
|----|------|------|---------------|
| CO-01 | Global listening | A1-C2 | Audio + comprehension questions |
| CO-02 | Selective listening | A1-C2 | Audio + targeted data extraction questions |
| CO-03 | Detailed listening | A2-C2 | Audio + full comprehension questions |
| CO-04 | Listen and complete | A2-C2 | Audio + gap-fill (synchronized) |
| CO-05 | Listen and take notes | B1-C2 | Audio + free-text note area |
| CO-06 | Phonetic discrimination | A1-B2 | Audio + minimal pair selection |
| CO-07 | Dictation | A1-C1 | Audio + text input for transcription |
| CO-08 | Authentic media | B2-C2 | Audio/video + comprehension. **Video out of scope for this sprint.** |

Additionally unlocks:
- **EO-10 Audio recording** (oral homework): requires recorder widget, separate from playback

## Architectural Decisions (Sophy vs Arch)

Two points of disagreement that need resolution:

### 1. New content block type or media attachment?

| Approach | Advocate | Pros | Cons |
|----------|----------|------|------|
| **New `Listening` ContentBlockType** with dedicated ListeningRenderer | Arch | Follows existing pattern (one type = one renderer). Explicit in content registry. ListeningRenderer composes AudioPlayer + existing widgets. | Adds a new type to the enum. |
| **Audio as optional attachment on existing blocks** | Sophy | No new type. CO exercises render through exercises/reading renderers with conditional audio player. | Implicit behavior. Harder to distinguish CO from CE exercises in the model. |

**PM recommendation:** Go with Arch's approach (new `Listening` type). It's consistent with how every other content type works in the codebase. The typed content model is our architectural moat; listening deserves its own type, not a bolt-on.

### 2. Storage: new container or reuse materials?

| Approach | Advocate | Rationale |
|----------|----------|-----------|
| New `media` container | Sophy | Separates concerns (audio vs documents) |
| Reuse `materials` container | Arch | Reuses existing Material entity, BlobStorageService, allowlist pattern. No Bicep changes. |

**PM recommendation:** Go with Arch (reuse materials). Less infrastructure work, follows existing patterns. Just add `audio/mpeg`, `audio/ogg`, `audio/wav` to the allowlist.

## Technical Architecture (Consolidated)

### Data Model

- Add `Listening` to `ContentBlockType` enum
- `GeneratedContent` JSON stores: transcript, exercise data (questions, gaps, answer key), `audioMaterialId` (references Material table)
- Audio files stored via existing Material entity linked to the section
- No new DB tables, no schema migration

### Frontend

- New `ListeningRenderer` registered in `contentRegistry.ts`
- Exports `Editor`, `Preview`, `Student` (standard pattern)
- Composes: `AudioPlayer` component + existing interaction widgets (fill-in-blank, free-text, multiple-choice)
- `AudioPlayer`: play/pause, seek bar, playback speed (0.75x/1x/1.25x), `onTimeUpdate` callback for synchronized exercises

### Backend

- Reuse `BlobStorageService` and `MaterialService`
- Add audio MIME types to `MaterialService.AllowedContentTypes`
- Upload endpoint: `POST /api/lessons/{id}/sections/{sectionId}/audio` (or reuse existing material upload)
- AI generates transcript + exercises in one pass; audio is added separately

### Risks (Arch)

- **SAS token expiry:** current 15-minute window may be too short for long audio playback. Consider increasing TTL for audio or implementing URL refresh.
- **File size:** current `MaxFileSizeBytes` is 10 MB. WAV files exceed this. Enforce MP3/OGG only, or raise the limit.
- **CO-08 (authentic media):** requires video. Explicitly out of scope for this sprint.

## Smallest Useful Increment (Sophy)

Three tasks, in dependency order:

### Task 1: AI generates CO exercise JSON (no audio)
- Add `listening` uiRenderer to CO types in catalog, set `available: true`
- AI generates transcript + comprehension exercises
- ListeningRenderer displays transcript + questions (no audio player yet)
- Teachers can create, review, edit listening exercises
- **Zero infrastructure changes. Immediately valuable for lesson prep.**

### Task 2: Audio upload + player
- Add audio MIME types to MaterialService allowlist
- Upload endpoint accepts MP3/OGG, stores in blob via Material entity
- ListeningRenderer adds AudioPlayer above transcript
- Teachers upload audio files to complete listening exercises
- **One backend endpoint, one frontend component.**

### Task 3: TTS generation (optional, could be next sprint)
- Azure Speech integration
- "Generate Audio" button on blocks with transcript but no audio
- Async generation, stores result in blob
- **Separate infra investment. Not required for MVP.**

## Exercise Types Per Task

| Task | Exercise Types Available | Teacher Value |
|------|------------------------|---------------|
| Task 1 (no audio) | CO-01 to CO-07 (content prep only) | Plan listening lessons, review transcripts, edit questions |
| Task 2 (upload) | CO-01 to CO-07 (fully functional) | Complete listening exercises with real audio |
| Task 3 (TTS) | CO-01 to CO-07 (auto-generated audio) | One-click audio for any transcript |

## Isaac's Input Needed

Before finalizing issues:
1. Which CO exercise types are most used at which levels? (prioritize sub-types within the sprint)
2. Are there CO exercises that work well WITHOUT audio in class (teacher reads aloud)? Those could ship in Task 1 as "read-aloud" exercises.
3. What audio duration is typical per exercise? (helps set file size limits)
4. Should dictation (CO-07) have special UI (pause/replay controls, segment markers)?

## Dependencies

- Pedagogical Quality sprint must complete first (exercise sub-format infrastructure)
- #338 (exercise type allowlist) should be done before this sprint (provides the `available` flag mechanism)

## Open Questions

- Should this sprint also include EO-10 (audio recording)? It needs a recorder widget, which is different infrastructure from playback.
- File size limits for audio: 10 MB (current) vs 25 MB vs 50 MB?
- CDN for audio delivery? Not MVP, but worth noting for later.
