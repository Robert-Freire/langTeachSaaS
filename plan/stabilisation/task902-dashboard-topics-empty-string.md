# Task 902: Dashboard TOPICS bare comma fix

## Problem
`NextSessionHero` renders a bare comma when `lastSessionTopicTags` is `[""]` because
`hasTopics = session.lastSessionTopicTags.length > 0` evaluates to true and
`.join(', ')` produces `", "`.

## Fix
- Derive `filteredTopicTags` by filtering `.trim() !== ''` before the `hasTopics` check.
- Use `filteredTopicTags` in the join expression.
- No backend change needed.

## Files changed
- `frontend/src/components/dashboard/NextSessionHero.tsx` — filter logic + join fix
- `frontend/src/components/dashboard/NextSessionHero.test.tsx` — 5 new unit tests in `topic tag filtering` describe block

## Acceptance criteria
- [x] Filter applied before `hasTopics` and before `.join`
- [x] TOPICS row hidden when filtered list is empty
- [x] Unit tests: empty array, single empty string, whitespace-only, mixed, all-real
- [x] Audit of `frontend/src/api/dashboard.ts` — no join there, data passes through as-is
