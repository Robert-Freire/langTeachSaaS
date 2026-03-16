# T15.4c — Conversation Type: Voice Practice

## Context

T15.4b adds AI conversation practice via text chat. This task adds voice input and output, turning the conversation into a spoken practice experience closer to real-life interaction.

Speaking is the hardest skill for language learners to practice alone. Text chat helps with vocabulary and grammar, but does nothing for pronunciation, fluency, or listening comprehension. Voice support bridges that gap.

**Timeline:** Post-beta, likely premium feature. Depends on T15.4b being stable.

## How it works

### Student flow

1. Student opens a conversation scenario and selects "Practice with AI" (from T15.4b)
2. A toggle or mode selector lets them switch between **Text** and **Voice** mode
3. In Voice mode:
   - The AI's responses are read aloud via text-to-speech (TTS)
   - The student speaks their response via microphone (speech-to-text, STT)
   - The transcribed text appears in the chat as a message, so the student can see what was understood
   - Key phrases are still shown as visual hints (same as text mode)
4. The student can tap the AI's message to replay the audio
5. The student can tap their own message to re-record if the transcription was wrong
6. End-of-session summary (from T15.4b) adds a pronunciation note if available from the STT engine

### Voice-specific behaviors

- **AI voice:** TTS reads the AI's role responses in the target language. Voice should match the language (e.g., Spanish TTS for Spanish lessons, not English TTS reading Spanish words).
- **Student mic:** STT transcribes in the target language. The language hint comes from the lesson metadata.
- **Fallback:** If mic permission is denied or STT fails, the student can always type instead. Voice mode degrades gracefully to text.
- **No forced speaking:** The student can mix voice and text within the same session (tap mic to speak, or type in the input field).

## Technical components

### Speech-to-Text (student input)

**Option A: Browser Web Speech API**
- Free, no backend cost
- `SpeechRecognition` API available in Chrome, Edge, Safari
- Set `lang` property to the lesson's target language
- Pro: zero infrastructure, works immediately
- Con: accuracy varies by language and accent, no Firefox support, requires internet

**Option B: Azure Speech Services**
- Higher accuracy, especially for non-English languages
- Requires backend proxy (API key should not be in the frontend)
- Pro: consistent quality, pronunciation assessment API available
- Con: cost per minute of audio, added backend complexity

**Recommendation:** Start with Option A (Web Speech API) for v1. It covers the major browsers (Chrome/Edge/Safari) and costs nothing. Evaluate Azure Speech if accuracy complaints arise or if pronunciation scoring becomes a priority.

### Text-to-Speech (AI output)

**Option A: Browser SpeechSynthesis API**
- Free, offline-capable
- Quality varies significantly by OS and language
- Pro: zero cost, no latency
- Con: robotic voices for some languages, inconsistent across devices

**Option B: Azure Speech Services / Cloud TTS**
- Natural-sounding voices across all supported languages
- Requires backend to generate audio and stream/cache it
- Pro: high quality, consistent
- Con: cost per character, latency for first play

**Recommendation:** Start with Option A (browser TTS). Modern browsers (especially Edge on Windows, Safari on macOS) have good neural voices. Add cloud TTS later as a premium quality upgrade.

### Frontend

| Component | Description |
|-----------|-------------|
| `VoiceControls.tsx` | Mic button (start/stop recording), audio playback button, mode toggle |
| Update `ConversationPracticePanel.tsx` | Integrate voice controls into the chat UI |
| `useSpeechRecognition.ts` hook | Wraps Web Speech API, handles permissions, language config, transcription events |
| `useSpeechSynthesis.ts` hook | Wraps SpeechSynthesis API, handles voice selection by language, playback state |

### Backend (v1: none needed)

With browser APIs for both STT and TTS, v1 requires no backend changes. Backend involvement starts only if/when cloud speech services are added.

### Backend (v2: cloud speech)

| Component | Description |
|-----------|-------------|
| `POST /api/speech/synthesize` | Accepts text + language, returns audio stream via Azure Speech |
| `POST /api/speech/transcribe` | Accepts audio blob + language, returns transcription via Azure Speech |
| Audio caching | Cache TTS output for repeated AI messages (same text = same audio) |

## UX considerations

1. **Mic permission prompt:** Show a friendly explanation before the browser permission dialog ("LangTeach needs your microphone to hear your responses")
2. **Visual feedback while speaking:** Pulsing mic icon or waveform animation so the student knows they're being heard
3. **Transcription preview:** Show the transcribed text before sending, so the student can correct or re-record
4. **Slow playback:** A 0.75x speed button for AI responses, helpful for lower-level students
5. **Noise handling:** If STT returns empty or garbage, prompt the student to try again or switch to text

## Browser compatibility

| Browser | STT (Web Speech API) | TTS (SpeechSynthesis) |
|---------|---------------------|----------------------|
| Chrome | Yes | Yes |
| Edge | Yes | Yes (best neural voices on Windows) |
| Safari | Yes (iOS 14.5+) | Yes |
| Firefox | No | Yes |

For Firefox users, voice input is unavailable in v1. The UI should hide the mic button and show text-only mode.

## Dependencies

- T15.4b (AI conversation practice, text-based)
- Lesson metadata must include target language (already exists)

## Out of scope for v1

- Pronunciation scoring/assessment
- Cloud TTS/STT (use browser APIs first)
- Voice selection preferences (automatic based on language)
- Recording and playback of full conversation sessions
- Offline voice support
