# Task 603 — Add student with difficulties to DemoSeeder

## Problem
`SeedVisualAsync` seeds Ana Visual with `Weaknesses` but no `Difficulties`. The difficulty chips
on the student detail page and the "Difficulties mentioned" section of the SessionLogDialog cannot
be visually verified during review-ui runs.

## Approach

### 1. Add `Difficulties` to Ana Visual (in `SeedVisualAsync`)
Add 3 difficulties using the rich `DifficultyDto` format (id, description, competency, subcategory,
severity, status, trend) covering 3 different valid competencies: Grammar, Vocabulary, Pronunciation.

```json
[
  {"id":"av1","description":"Separable vs inseparable phrasal verbs","competency":"Grammar","subcategory":"Phrasal verbs","severity":"medium","status":"Active","trend":"stable"},
  {"id":"av2","description":"Travel collocations","competency":"Vocabulary","subcategory":"Travel","severity":"low","status":"Active","trend":"improving"},
  {"id":"av3","description":"Word stress in multi-syllable words","competency":"Pronunciation","subcategory":"Word stress","severity":"medium","status":"Active","trend":"stable"}
]
```

### 2. Add a session log for Ana Visual with `MentionedDifficultyPairs` and `SuggestedDifficulties`
This covers the SessionLogDialog "Difficulties mentioned" section. Add via a new private helper
`SeedAnaVisualSessionLogAsync` with an idempotency guard (`AnyAsync` on StudentId).

The helper is called from both:
- The early-return path (already seeded, scenario students refreshed)
- The normal seeding path (after `SaveChangesAsync`)

The session log will contain:
- `MentionedDifficultyPairs`: Grammar/Phrasal verbs, Vocabulary/Travel collocations
- `SuggestedDifficulties`: one suggestion (Grammar, Phrasal verbs, medium)

## Files changed
- `backend/LangTeach.Api/Data/DemoSeeder.cs`

## Acceptance criteria
- Ana Visual has 3 non-empty difficulties with distinct competencies
- One confirmed session log exists for Ana Visual with non-empty `MentionedDifficultyPairs` and `SuggestedDifficulties`
- Seeder is idempotent: re-running on an existing seed does not duplicate data
