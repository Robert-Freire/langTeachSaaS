# Task 215: Design LangTeach Logo

## Goal
Create logo assets for LangTeach: full logo (icon + wordmark), icon-only, and Auth0 PNG.

## Current State
- `frontend/public/favicon.svg`: two overlapping speech bubbles (indigo-300 back, indigo-500 front) with text lines. 48x48 viewBox.
- No `logo.svg` or `logo-icon.svg` exists yet.

## Deliverables
1. `frontend/public/logo.svg` — full horizontal logo (icon left, "LangTeach" wordmark right)
2. `frontend/public/logo-icon.svg` — refined icon-only (square, works 16-48px)
3. `frontend/public/logo-auth0.png` — 150x150 PNG for Auth0 upload
4. `frontend/public/favicon.svg` — update if icon is refined

## Approach

### Icon Design
Keep the two overlapping speech bubbles concept from the favicon. Minor refinements:
- Back bubble: indigo-300 (`#a5b4fc`), positioned top-right
- Front bubble: indigo-500 (`#6366f1`), with text lines in white
- Ensure clean rendering at small sizes

### Full Logo (`logo.svg`)
- ViewBox: 200x48 (icon 48x48 + gap + wordmark)
- Icon at left (0,0,48,48)
- "LangTeach" wordmark to the right using a clean sans-serif font
- "Lang" in indigo-700 (`#4338ca`), "Teach" in indigo-500 (`#6366f1`) for subtle two-tone effect
  OR single color indigo-700 for cleaner look — go with indigo-700 for professionalism
- Font: system sans-serif stack embedded as text (no external font dependency)

### Icon-only (`logo-icon.svg`)
- Same as refined favicon, viewBox 48x48
- Identical to favicon unless we refine the icon

### Auth0 PNG
- Generate 150x150 PNG from logo-icon.svg
- Use `npx sharp-cli` or `Inkscape` if available, otherwise note it as manual step

## Implementation Plan
1. Write `logo-icon.svg` (refined icon, square, same concept as favicon)
2. Write `logo.svg` (icon + wordmark, horizontal)
3. Update `favicon.svg` if icon changes
4. Attempt PNG export via available CLI tools
5. Review plan, implement, run qa-verify + review agents

## No Backend Changes
Pure frontend static asset task. No API changes, no component changes (yet — #214 will consume the logo).
