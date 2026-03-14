---
name: T9.1 — Brand & Logo
description: Design and implement a proper logo/icon for LangTeach SaaS
type: project
---

# T9.1 — Brand & Logo

**Phase:** 1 (post-T9, design review)
**Status:** pending
**Depends on:** T9 (CI/CD) — do after project has more screens built

---

## Objective

Replace the "LangTeach" text wordmark in the sidebar with a proper logo/icon that reflects the brand personality.

## Context

Deferred deliberately. A logo done too early becomes technical debt. Do this when:
- T6, T7, T8 are complete (more screens exist to see the full context)
- Brand personality is clearer
- Approaching first real users

## Scope

- Design a logomark (icon) + logotype (text) combination
- Consider using an AI image generation tool (e.g. image generation via Claude) for initial concepts
- Implement as SVG in the AppShell sidebar logo area
- Update favicon (`/favicon.svg`)

## Definition of Done

- [ ] Logo SVG approved by user
- [ ] Implemented in AppShell and favicon
- [ ] Looks correct at sidebar width (240px) and small sizes
