# review-ui Scenario Students

These students are seeded by the visual seed (`--visual-seed`) and are stable across re-runs (upsert by name).
When launching the `review-ui` agent for any screen involving student data, include the relevant scenario student name in the prompt so the agent navigates to a student with known, populated data.

## Lookup Table

| Scenario | Seed student | Use when reviewing |
|----------|-------------|-------------------|
| `rich-profile` | Ana Seed | Student detail overview tab, Teaching Context card, profile display, native language badge, CEFR level display |
| `excel-imported` | Marco Seed | Notes parsing display, Excel import UI, imported student notes subsections |
| `minimal` | Clara Seed | Empty states, missing-field warnings, completeness bar, minimal student card |
| `with-history` | Diego Seed | History tab, lesson history card, session log list, post-class tracking screens |

## Profile Summary

| Student | Language | CEFR | Native | Fields |
|---------|----------|------|--------|--------|
| Ana Seed | English | B1 | Portuguese | Goals, interests, difficulties, weaknesses, notes |
| Marco Seed | English | A2 | -- | Notes only (Excel-import format), no manual fields |
| Clara Seed | Spanish | A1 | -- | Name + language only |
| Diego Seed | English | B2 | Spanish | Goals, interests, 2 session log entries |

## How to Use in Agent Prompts

Example:
> Review the student detail page at `/students`. Use the student named **Ana Seed** (rich-profile scenario) so the Teaching Context card and profile fields are populated.

> Check the history tab on the student detail page. Use **Diego Seed** (with-history scenario) who has 2 completed session log entries.
