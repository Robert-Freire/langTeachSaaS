---
name: Audio transcription method
description: How to transcribe audio files (opus, mp3, etc.) using OpenAI Whisper locally with ffmpeg
type: reference
---

## Audio Transcription Setup

**Tool:** OpenAI Whisper (Python package `openai-whisper`)
**Dependency:** ffmpeg (installed via `winget install --id Gyan.FFmpeg`)

### Usage (Python)

```python
import os
os.environ['PATH'] = r'C:\Users\Robert\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin;' + os.environ['PATH']
import whisper
model = whisper.load_model('base')
result = model.transcribe(r'path/to/audio.opus')
print(result['text'])
```

### Notes
- ffmpeg path must be added to PATH explicitly since it was installed via winget and the bash shell doesn't pick it up automatically
- Model `base` works well for Spanish voice notes, runs on CPU (FP32, no GPU needed)
- Output may have encoding issues in console for non-ASCII characters (accented Spanish), clean up manually when saving
- First used 2026-03-18 to transcribe WhatsApp voice notes (.opus format)
