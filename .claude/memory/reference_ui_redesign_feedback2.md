---
name: UI redesign feedback 2 (Vera post-implementation review)
description: Live actionable UI issues list from Vera's post-implementation review. Only screens reviewed so far; others pending.
type: reference
---

File: `plan/ui-redesign-feedback2.md`

This is the actionable list of UI fixes found after the sprint implementation. Only contains things to fix — no status notes, no confirmations.

## Screens reviewed (2026-04-15)

- Dashboard (Zones 1-3, Stitch comparison done)
- Student Detail: Header, Overview, Profile, Sessions, Progress tabs

## Screens NOT yet reviewed

- Students List
- Log Session
- Edit Student
- Courses / Lessons views

## Issues created from this doc

- #763 — Seed data cleanup (native language, duration, junk data)
- #764 — Dashboard display polish (followup labels, relative dates, NEXT+LAST merge, agenda status labels)

## Pattern

When finishing a review session, batch issues as:
1. Seed/data fixes (area:infra, no code changes)
2. Screen-specific polish (area:frontend per screen)
Hold off on creating issues for screens not yet reviewed.
