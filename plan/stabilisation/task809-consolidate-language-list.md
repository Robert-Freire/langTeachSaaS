# Task 809 — Consolidate Language List into Single Source of Truth

**Issue:** #809  
**Branch:** worktree-task-t809-consolidate-language-list  
**Sprint:** stabilisation

## Problem

`AllowedNativeLanguages` in `StudentService.cs` (58 entries: 57 languages + "Other") and `ALL_LANGUAGES` in `frontend/src/lib/languages.ts` (57 entries, no "Other") are independently maintained. Any language addition requires updating two files and risks drift. "Other" is inconsistently present (backend yes, frontend `ALL_LANGUAGES` no, frontend `NATIVE_LANGUAGES` yes).

## Solution

Create `data/languages.json` as the single canonical list. Backend embeds it as an assembly resource. Frontend imports it via a Vite alias. Docker build context is widened to include `data/`.

## Docker Build Context Change

The frontend Dockerfile currently uses `context: ./frontend`, which excludes `data/`. To make `data/languages.json` available at both build time and dev time:

- **docker-compose.yml** and **docker-compose.e2e.yml**: change frontend `build.context` to `.` (repo root), set explicit `dockerfile: frontend/Dockerfile`, add volume `./data:/data:ro`.
- **frontend/Dockerfile**: update COPY commands to use `frontend/` prefix; add `COPY data/ /data/` in the `base` stage so the prod build has access.
- **vite.config.ts**: add `@data` alias resolving to `path.resolve(__dirname, '../data')` (= `../data` from `frontend/`, = `/data` in Docker); add `server.fs.allow` entry for that path.

In Docker, WORKDIR is `/app`, so `path.resolve('/app', '../data')` = `/data`, which matches both the volume mount and the COPY destination.

## Files Changed

### New
- `data/languages.json` — 58-entry JSON array, alphabetical, "Other" at end

### Backend
- `backend/LangTeach.Api/LangTeach.Api.csproj` — add `<EmbeddedResource Include="..\..\data\languages.json" Link="languages.json" />`
- `backend/LangTeach.Api/Services/StudentService.cs` — replace hardcoded `AllowedNativeLanguages` static initializer with load from `Assembly.GetExecutingAssembly().GetManifestResourceStream("LangTeach.Api.languages.json")`, parse `string[]` via `JsonSerializer`

### Frontend
- `frontend/src/lib/languages.ts` — replace hardcoded `ALL_LANGUAGES` array with `import allLanguagesJson from '@data/languages.json'`; export as `ALL_LANGUAGES = allLanguagesJson as readonly string[]`; "Other" will now be present in `ALL_LANGUAGES`
- `frontend/vite.config.ts` — add `@data` resolve alias + `server.fs.allow` entry
- `frontend/tsconfig.json` — add `"@data/*": ["../data/*"]` to paths
- `frontend/tsconfig.app.json` — add `"@data/*": ["../data/*"]` to paths (tsc uses this file for src/ compilation)

### Docker
- `docker-compose.yml` — frontend `build.context: .`, `dockerfile: frontend/Dockerfile`, add `./data:/data:ro` volume
- `docker-compose.e2e.yml` — same frontend build context + volume changes
- `docker-compose.qa.yml` — same frontend build context + volume changes
- `frontend/Dockerfile` — change `COPY package.json package-lock.json .npmrc ./` to `COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./`; `COPY . .` to `COPY frontend/. .`; add `COPY data/ /data/` in `base` stage

## Implementation Details

### data/languages.json
```json
[
  "Afrikaans", "Albanian", "Amharic", "Arabic", "Armenian", "Azerbaijani",
  "Basque", "Belarusian", "Bengali", "Bosnian", "Bulgarian",
  "Catalan", "Chinese (Cantonese)", "Chinese (Mandarin)", "Croatian", "Czech",
  "Danish", "Dutch",
  "English", "Estonian",
  "Farsi", "Finnish", "French",
  "Galician", "Georgian", "German", "Greek", "Gujarati",
  "Hebrew", "Hindi", "Hungarian",
  "Icelandic", "Indonesian", "Italian",
  "Japanese",
  "Kannada", "Kazakh", "Korean",
  "Latvian", "Lithuanian",
  "Macedonian", "Malay", "Maltese", "Mandarin", "Marathi",
  "Nepali", "Norwegian",
  "Pashto", "Polish", "Portuguese", "Punjabi",
  "Romanian", "Russian",
  "Serbian", "Sinhalese", "Slovak", "Slovenian", "Somali", "Spanish", "Swahili", "Swedish",
  "Tagalog", "Tamil", "Telugu", "Thai", "Turkish",
  "Ukrainian", "Urdu", "Uzbek",
  "Vietnamese",
  "Welsh",
  "Yoruba",
  "Zulu",
  "Other"
]
```

### StudentService.cs — new static initializer
```csharp
private static readonly HashSet<string> AllowedNativeLanguages;

static StudentService()
{
    using var stream = Assembly.GetExecutingAssembly()
        .GetManifestResourceStream("LangTeach.Api.languages.json")!;
    var languages = JsonSerializer.Deserialize<string[]>(stream)!;
    AllowedNativeLanguages = new HashSet<string>(languages, StringComparer.Ordinal);
}
```

`System.Reflection` using added.

### languages.ts — imports
```ts
import allLanguagesJson from '@data/languages.json'
export const ALL_LANGUAGES = allLanguagesJson as readonly string[]
export const ALL_LANGUAGE_OPTIONS = ALL_LANGUAGES.map((lang) => ({ value: lang, label: lang }))
```

`LANGUAGES`, `NATIVE_LANGUAGES`, `NATIVE_LANGUAGE_OPTIONS`, `LANG_TO_CODE` unchanged.

### vite.config.ts additions
```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@data': path.resolve(__dirname, '../data'),
  },
},
server: {
  fs: {
    allow: [path.resolve(__dirname, '.'), path.resolve(__dirname, '../data')],
  },
  // ... existing proxy, allowedHosts
}
```

## Tests

- Backend unit tests already cover `CreateAsync_AllNativeLanguages_AreAccepted` with inline data. These will continue to pass unchanged (the allowed set is the same).
- The `CreateAsync_UnknownNativeLanguage_ThrowsValidationException` test still passes.
- No new test needed: the existing tests exercise the validation path.
- Frontend unit tests: `ALL_LANGUAGES` is consumed via `ALL_LANGUAGE_OPTIONS` in combobox components; existing component tests mock the API, not the language list, so they remain unaffected.

## Acceptance Criteria Mapping

| AC | How satisfied |
|----|---------------|
| `data/languages.json` exists with 57+1 entries | Created with all 58 entries |
| Backend reads from JSON, no hardcoded list | EmbeddedResource + static constructor |
| Frontend imports from JSON, no hardcoded list | `@data/languages.json` import |
| Both sides include "Other" consistently | JSON has "Other"; `ALL_LANGUAGES` now includes it |
| Existing validation tests pass | Unchanged tests, same language set |
| Adding a language = one file change | Edit `data/languages.json` only |
