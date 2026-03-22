# Task 199: Fix Flaky Test — StudentForm 'allows adding a custom free-text weakness'

## Problem

`StudentForm.test.tsx` uses `screen.getByRole('option', { name: '...' })` (synchronous) immediately after clicking a dropdown trigger. In CI (slower runners) the options aren't in the DOM yet, causing intermittent failures.

## Root Cause

`getByRole` is synchronous — it queries the DOM at that exact instant. Dropdown options rendered by a Select/Combobox component are injected asynchronously after the trigger click. In CI the delay is larger, so the query fires before options appear.

## Fix

Replace every `screen.getByRole('option', ...)` that follows a click with `await screen.findByRole('option', ...)`. `findByRole` polls until the element appears or times out, making the test robust.

Lines affected in `StudentForm.test.tsx`:
- L313: click option 'Spanish' in includes-difficulties test
- L315: click option 'B1' in same test
- L339: click option 'English' in shows-English-weaknesses test
- L345: assertion on 'Phrasal Verbs' (first option check, used to wait for dropdown to render)
- L374: assertion on 'Ser/Estar' in shows-Spanish-weaknesses test
- L410: click option 'English' in allows-adding-custom-weakness test (reported failure)

Negative assertions (`queryByRole`) that follow an already-awaited `findByRole` in the same test are fine — the DOM is stable by then.

## Scope

Only `StudentForm.test.tsx`. No production code changes needed. The flakiness is purely in test query strategy.

## Acceptance Criteria

- All `getByRole('option')` calls after dropdown trigger clicks replaced with `findByRole`
- All tests in `StudentForm.test.tsx` pass reliably
- No other test files have the same pattern (check with grep)
