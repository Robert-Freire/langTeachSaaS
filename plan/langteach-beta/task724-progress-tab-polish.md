# Task 724 — Progress Tab Visual Fixes and Data Clarity

## Issue
[#724 polish: Student Detail Progress tab visual fixes and data clarity](https://github.com/Robert-Freire/langTeachSaaS/issues/724)

## Scope

All changes are in `frontend/src/components/student/ProgressDashboard.tsx` and its test file `ProgressDashboard.test.tsx`.

## Changes

### 1. Difficulty text truncation + tooltip (HIGH)

**Current:** `<span className="text-xs font-bold text-[#1A1B22] truncate mr-2 max-w-[140px]">{d.description}</span>`

**Fix:** Wrap in `TooltipPrimitive.Root/Trigger/Popup` (already imported) showing `d.description` on hover. Keep the truncated span as the trigger child.

### 2. Competency label on difficulty entries (HIGH)

**Current:** Only `d.description` renders.

**Fix:** Add a small competency badge above/below the description within the same list item. Use a muted label style (e.g. `text-[0.5625rem] font-bold uppercase text-zinc-400`).

### 3. Time-since-last-mention on difficulty badges (HIGH)

**Approach:** Compute per-difficulty the most recent session date where that difficulty's `competency|subcategory` pair appeared in `mentionedDifficultyPairs`. Format the elapsed time as `"Nd"` (days) or `"Nw"` (weeks, if >= 7 days). Show next to the status badge.

**New helper:** `computeLastMentionDates(sessions): Map<string, Date>` — module-level function (like `computeRecentMentions`), parses `mentionedDifficultyPairs` across all confirmed sessions, returns map of `` `${p.Competency}|${p.Subcategory}` `` -> most recent session date. Keys must use capital C/S (`p.Competency`, `p.Subcategory`) to match the JSON field names in `mentionedDifficultyPairs`, consistent with `computeRecentMentions` at line 82.

Display: `<span className="text-[0.5625rem] text-zinc-400 shrink-0">{timeSince}</span>` adjacent to the badge.

### 4. Baseline/target marker on skill bars (HIGH)

**Current:** There is already a `div` rendering the baseline line (line 167-171 of ProgressDashboard.tsx):
```tsx
<div
  className="absolute top-0 h-full w-0.5 bg-zinc-400/50 z-10"
  style={{ left: `${baselinePercent}%` }}
/>
```

**Current state:** The baseline marker div already exists at lines 167-171 with `aria-label`. The track at line 165 has `overflow-visible`, so clipping is NOT the issue. The artifact div (lines 172-175, change 6) renders a partial-width `overflow-hidden` div that visually overlaps the marker on some bars.

**Fix:** After removing the artifact div (change 6), visually verify the marker. If it's still not visible (likely due to z-index or color being too subtle), change `bg-zinc-400/50` to `bg-[#C7C4D8]` and ensure `z-10` is set. Extend the marker slightly above/below the bar using `top: -2px; bottom: -2px; height: auto` (remove `h-full`, use absolute `inset-y-[-2px]`).

### 5. 2+ level gap visual warning (HIGH)

**Logic:** For each skill, compute `gap = CEFR_ORDER[student.cefrLevel] - CEFR_ORDER[level]`. If `gap >= 2`, apply an amber accent.

**Current:** Below-baseline uses `bg-[#C3C0FF]` (light purple). For gap >= 2: use `bg-amber-400` bar tint + add a small amber badge `"! Gap"` next to the CEFR badge.

### 6. Fix Listening bar two-tone (HIGH)

**Root cause:** The current bar structure renders a background div (`bg-[#F4F2FD]` track) plus a fill div that sits absolute on top. However there's also a second `div` at line 173-175:
```tsx
<div
  className="h-full rounded-full overflow-hidden"
  style={{ width: `${baselinePercent}%` }}
/>
```
This empty div with `overflow-hidden` creates a visual artifact on some bars depending on bar width vs baseline. **Remove this empty div entirely** — it serves no purpose (it was a leftover from a draft).

### 7. Right column breathing room (MEDIUM)

**Fix:** Change Pacing Analytics from `p-6` to `p-7` and add `space-y-6` (from `space-y-5`). Change Difficulties Summary from `p-6` to `p-7`. Change the gap between them from `space-y-4` to `space-y-5` on the right column container.

### 8. Remove Pacing Analytics dot chart decoration (LOW)

There is no decorative dot chart visible in the current code — this may have been in a prior design. No action needed unless it appears during UI review.

### Layout note for change 2

The difficulty row uses `flex items-center justify-between`. To add a competency label, wrap description + competency in a `flex-col` sub-container (left side) and keep the badge on the right:
```tsx
<div className="flex flex-col gap-0.5 mr-2 min-w-0">
  <span className="text-xs font-bold text-[#1A1B22] truncate max-w-[140px]">{d.description}</span>
  <span className="text-[0.5625rem] font-bold uppercase text-zinc-400">{d.competency}</span>
</div>
```

## Test Plan

Add/update tests in `ProgressDashboard.test.tsx`:
- Tooltip on difficulty description (check tooltip content is in DOM)
- Competency label renders for each difficulty
- Time-since-last-mention renders for difficulties that were recently or not-recently mentioned
- Baseline marker is present in DOM (`aria-label="Baseline B1"`)
- 2+ level gap: amber class applied when gap >= 2
- The empty artifact div is not present (indirect: bar renders without two-tone class)
- 2+ level gap: amber bar class applied when gap >= 2 (use fixture: student B1 with Listening A1 = gap 2, Writing A2 = gap 1; only Listening should be amber)

### E2E test (Playwright)

Add a Playwright test in the existing student detail spec. Navigate to the Progress tab for Ana (who has skill overrides). Assert:
- Skill Imbalance section is visible
- At least one skill bar is present
- Difficulties summary is visible (if Ana has difficulties in seeder)

## Files Changed
- `frontend/src/components/student/ProgressDashboard.tsx`
- `frontend/src/components/student/ProgressDashboard.test.tsx`
