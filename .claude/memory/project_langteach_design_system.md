---
name: LangTeach SaaS — Design System
description: Where to find UI/UX standards; current design system is Academic Atelier (Stitch)
type: project
---

## Authoritative Reference

**`docs/design-system.md`** is the single source of truth for all UI work. Read it before implementing or reviewing any screen. It covers:
- Visual standards (colors, typography, elevation, components)
- Interaction patterns (autosave, list add, session inline edit)
- What is explicitly not allowed (Save/Cancel on inline edits, kebab-only-for-edit, etc.)

## Design System: Academic Atelier

The current design system is "Academic Atelier" (also called the Stitch design system), established during the UI Redesign sprint. NOT the original shadcn/zinc system from T5.1.

Key characteristics:
- **No-Line Rule**: no 1px borders between sections; use tonal layering (background color shifts) instead
- **Tonal surface hierarchy**: `surface` (#FBF8FF) → `surface-container-low` (#F4F2FD) → `surface-container-lowest` (#FFF)
- **Primary color**: indigo `#3525CD` with gradient to `#4F46E5` on primary buttons
- **Fonts**: Manrope (display/headlines) + Inter (UI/body)
- **CEFR badges**: square format (not pill), color-coded by level group (A/B/C)

Stitch mockup files per screen: `plan/langteach-beta/stitch-design-system/`

## Interaction Pattern Standard (set 2026-04-16)

Three permitted patterns -- see `docs/design-system.md` section 8 for full rules:
- **Pattern A**: Autosave on blur for single-value fields (no Save/Cancel buttons)
- **Pattern B**: Immediate-add for growing lists (+ button, no Save/Cancel)
- **Pattern C**: Full-page edit form with Done button (Done = navigation, not save)

Every autosave must show a `<SavedIndicator />` component (fade-in "Saved ✓", 1.5s).

**Why:** the app had three inconsistent save models on the same screen. The standard was set to eliminate all Save/Cancel buttons from inline edits on the student detail Profile tab.
