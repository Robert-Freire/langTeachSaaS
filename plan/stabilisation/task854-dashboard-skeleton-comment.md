# Task 854: Document Dashboard skeleton loading pattern

## Issue
#854 - chore: document or share Dashboard skeleton loading pattern

## Decision
Option B from issue: add a single comment in Dashboard.tsx above the skeleton JSX block.
No shared component needed (pattern exists in one place only).

## Change
Added one comment line above the `if (isLoading)` block in `Dashboard.tsx` explaining:
- Why Dashboard uses skeleton instead of spinner (multiple distinct layout regions)
- That this is intentional divergence
- When to reuse it (similarly complex multi-region pages)

## File changed
`frontend/src/pages/Dashboard.tsx`
