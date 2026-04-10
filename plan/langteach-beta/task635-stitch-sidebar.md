# Task 635: Adopt Stitch Sidebar Design

## Goal
Replace `AppShell.tsx` sidebar with the Stitch "Academic Atelier" visual style: tonal layering, left border active indicator, Inter typography, logo header with subtitle, and user card at bottom.

## Acceptance criteria (from issue)
- Sidebar background `#F4F2FD` (surface-container-low), no 1px border against main content
- Active item: 3px left indigo border bar + white (`#FFFFFF`) background
- Hover: `#E6E0F8` (surface-container-highest), no border
- Nav order: Dashboard, Students, Courses, Lessons, Settings
- "LANGUAGE CURATOR" subtitle below logo (0.6875rem, uppercase, 0.05em tracking)
- User card: avatar + name + "TEACHER" label at bottom
- Manrope + Inter fonts loaded via Google Fonts and applied
- Mobile responsive (Sheet drawer preserved)
- E2E: navigation still works

## Files to change

### 1. `frontend/index.html`
Add Google Fonts `<link>` tags for Manrope (400,700,800) and Inter (400,500,600) using preconnect + stylesheet pattern.

### 2. `frontend/src/index.css`
Add an `@theme` block to register the font families as named Tailwind utilities (Tailwind v4 pattern):
```css
@theme {
  --font-inter: 'Inter', sans-serif;
  --font-manrope: 'Manrope', sans-serif;
}
```
This enables `font-inter` and `font-manrope` utility classes.

### 3. `frontend/src/components/AppShell.tsx`
- Replace `UserCircle` import with `Settings` in lucide-react import line
- **Sidebar bg**: `bg-[#F4F2FD]` (remove `bg-white`, remove `border-r`)
- **Main content bg**: keep `bg-zinc-50` -- tonal difference creates natural separation without borders
- **Nav items** (updated order and styles):
  - Remove "My Profile" item; keep Settings at position 5
  - Order: Dashboard `/`, Students `/students`, Courses `/courses`, Lessons `/lessons`, Settings `/settings`
  - Icon additions: import `Settings` from lucide (already imported in mockup); drop `UserCircle`
  - Active class: `bg-white border-l-[3px] border-l-indigo-600 text-indigo-700 font-medium`
  - Inactive class: `text-zinc-500 hover:bg-[#E6E0F8] hover:text-zinc-900 font-medium`
  - Remove `rounded-md` from active (left border needs flush left); use `rounded-r-md` only
  - Typography: `text-base font-medium font-['Inter']` on nav labels
- **Header area**:
  - Remove `border-b` from logo section
  - Add subtitle `<p>` "LANGUAGE CURATOR" styled: `text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400`
- **User card** (bottom):
  - Keep `UsageIndicator`
  - Replace bare flex row with a contained card: `bg-white rounded-xl p-3` wrapping avatar + name column + "TEACHER" label
  - Add `<span className="text-[0.6875rem] font-bold uppercase tracking-wider text-zinc-400">Teacher</span>` below name
  - Remove standalone logout button; integrate a subtle logout icon or keep as is (issue doesn't explicitly redesign logout)
- **Mobile top bar**: minimal change -- keep hamburger + LangTeach logo wordmark

### 3. `frontend/src/components/AppShell.test.tsx`
- Update nav order test: verify Courses appears before Lessons
- Update `renders nav items` test if it checks specific items by order

### E2E
- `navigation-flow.spec.ts` already uses `page.goto()` direct navigation -- no change needed
- No new e2e test required: existing navigation coverage satisfies the AC

## Out of scope (per issue)
- Dashboard content, student pages, CSS variable tokens, Sessions nav item (#640)

## Risk
- The `aside` desktop sidebar currently uses `hidden lg:flex` -- unit test checks this. Preserve that class structure.
- `font-['Inter']` Tailwind syntax requires v3 arbitrary values. Confirm it works or use `style={{ fontFamily: 'Inter, sans-serif' }}` inline if needed.
