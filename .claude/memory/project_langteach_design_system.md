---
name: LangTeach SaaS — Design System Decisions
description: UI design choices, rationale, and conventions established in T5.1
type: project
---

## Component Library
- **shadcn/ui** + **Tailwind CSS v4** + **@tailwindcss/vite**
- Components live in `frontend/src/components/ui/` (copy-paste, not a package)
- `cn()` utility from `@/lib/utils` — always use for className merging (clsx + tailwind-merge)
- Icon library: **Lucide React** (`lucide-react`) — default size `h-4 w-4`, nav icons `h-5 w-5`
- Font: **Geist Variable** (installed by shadcn init, replaces Inter from original spec)

## Color Palette (CSS variables in `src/index.css`)
- **Primary**: indigo-600 `oklch(0.511 0.262 276.966)` — buttons, active nav, badge selections
- **Ring**: indigo-500 `oklch(0.585 0.233 277.117)` — focus rings
- Neutrals: zinc scale throughout (zinc-50 background, zinc-200 borders, zinc-600 body text)
- Semantic: emerald-600 success, amber-500 warning, red-600 error

## Layout (AppShell — `src/components/AppShell.tsx`)
- **Sidebar**: white bg, `border-r border-zinc-200`, 240px wide
  - Rationale: tried zinc-900 (too stark) and indigo-950 (better but still too contrasty) — light sidebar won
  - "LangTeach" logo: `text-indigo-600 font-bold` wordmark (no icon yet — deferred to T9.1)
  - Active nav item: `bg-indigo-50 text-indigo-700` + indigo icon
  - Inactive: `text-zinc-600 hover:bg-zinc-50`
- **Content area**: `bg-zinc-50`, padding `p-6`

## Component Conventions
- Cards: `bg-white border border-zinc-200 rounded-lg` (shadcn Card default)
- Buttons: primary uses `bg-indigo-600 hover:bg-indigo-700` explicitly (shadcn primary maps to CSS var)
- Toggle badges (languages, CEFR, style): button wrapping Badge, `aria-pressed` for state + testability
  - Selected: `bg-indigo-600 text-white`
  - Unselected: `bg-white text-zinc-600 border-zinc-200`
- Form fields: Label above Input, `max-w-sm` width, grouped in Cards with CardHeader/CardContent

## Infrastructure Notes
- `.npmrc` has `legacy-peer-deps=true` — required because `@tailwindcss/vite` peer dep doesn't yet list Vite 8
- `frontend/Dockerfile` copies `.npmrc` before `npm ci` for the same reason
- `tsconfig.app.json` and `tsconfig.json` both have `baseUrl` + `paths` for `@/` alias
- `@testing-library/dom` added explicitly to devDeps (peer dep of @testing-library/react, not auto-installed)

## Deferred
- T9.1: proper logo/icon — defer until T6-T8 done and brand personality is clearer
- Dark mode: shadcn supports it via `.dark` class, not wired up yet
- Mobile responsiveness: basic usability only, full pass deferred
