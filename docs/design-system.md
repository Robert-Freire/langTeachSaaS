# LangTeach SaaS — Design System

**Status:** draft — awaiting user approval before implementation
**Task:** T5.1

---

## 1. Design Direction

**Theme: "Calm Professional"**

Target users are professional language teachers managing students, lessons, and schedules. The interface should feel:
- **Trustworthy and organised** — not playful or gamified (that's Duolingo territory)
- **Clean and uncluttered** — teachers are busy; every element must earn its place
- **Modern SaaS** — comparable to tools like Linear or Notion in feel, not legacy school software

**Reference benchmarks:** Preply (professional tutor marketplace), Teachworks (school management), and modern SaaS admin dashboards built with shadcn/ui.

---

## 2. Color Palette

All colors map to Tailwind CSS utility classes.

### Brand Colors

| Token | Tailwind class | Hex | Usage |
|---|---|---|---|
| Primary | `indigo-600` | `#4f46e5` | Buttons, active nav, links, focus rings |
| Primary hover | `indigo-700` | `#4338ca` | Button hover state |
| Primary light | `indigo-50` | `#eef2ff` | Selected row backgrounds, badge backgrounds |

### Neutral (base of all surfaces and text)

| Token | Tailwind class | Hex | Usage |
|---|---|---|---|
| Background | `zinc-50` | `#fafafa` | Page background |
| Surface | `white` | `#ffffff` | Cards, modals, form inputs |
| Border | `zinc-200` | `#e4e4e7` | Dividers, input borders, card borders |
| Text primary | `zinc-900` | `#18181b` | Headings, important labels |
| Text secondary | `zinc-600` | `#52525b` | Body text, descriptions |
| Text muted | `zinc-400` | `#a1a1aa` | Placeholders, disabled labels, captions |

### Sidebar

| Token | Tailwind class | Hex | Usage |
|---|---|---|---|
| Sidebar bg | `zinc-900` | `#18181b` | Sidebar background |
| Sidebar text | `zinc-400` | `#a1a1aa` | Inactive nav item text |
| Sidebar text active | `white` | `#ffffff` | Active nav item text |
| Sidebar item active bg | `zinc-800` | `#27272a` | Active nav item background |
| Sidebar item hover bg | `zinc-800` | `#27272a` | Hover state |

### Semantic

| Token | Tailwind class | Hex | Usage |
|---|---|---|---|
| Success | `emerald-600` | `#059669` | Success badges, confirmations |
| Success bg | `emerald-50` | `#ecfdf5` | Success alert background |
| Warning | `amber-500` | `#f59e0b` | Warning badges |
| Warning bg | `amber-50` | `#fffbeb` | Warning alert background |
| Error | `red-600` | `#dc2626` | Error messages, destructive buttons |
| Error bg | `red-50` | `#fef2f2` | Error alert background |

---

## 3. Typography

**Font family:** `Inter` (loaded via Google Fonts or `@fontsource/inter`)
- Inter is the standard for modern SaaS. Excellent readability at small sizes. Already used by shadcn/ui defaults.

### Type Scale

| Role | Class | Size | Weight | Usage |
|---|---|---|---|---|
| Page title | `text-2xl font-semibold` | 24px | 600 | Page headings (h1) |
| Section title | `text-lg font-semibold` | 18px | 600 | Card titles, section headers |
| Body | `text-sm` | 14px | 400 | Default body text, form labels |
| Caption | `text-xs` | 12px | 400 | Helper text, timestamps, metadata |
| Label | `text-sm font-medium` | 14px | 500 | Form field labels |

**Line height:** `leading-normal` (1.5) for body, `leading-tight` (1.25) for headings.
**Text color default:** `zinc-700` — slightly softer than pure black.

---

## 4. Spacing Scale

Use Tailwind's default 4px-base scale consistently. Key values:

| Token | Value | Common usage |
|---|---|---|
| `p-2` | 8px | Tight padding (badges, small inputs) |
| `p-4` | 16px | Standard card padding, form field spacing |
| `p-6` | 24px | Card content area |
| `gap-4` | 16px | Default gap between form rows |
| `gap-6` | 24px | Gap between page sections |
| `mb-8` | 32px | Space below page title before content |

---

## 5. Component Style Direction

### Buttons

| Variant | Usage | Style |
|---|---|---|
| Primary | Main CTA (Save, Submit, Create) | `bg-indigo-600 text-white rounded-md` |
| Secondary / Outline | Secondary action (Cancel, Edit) | `border border-zinc-200 bg-white text-zinc-700 rounded-md` |
| Destructive | Irreversible actions (Delete) | `bg-red-600 text-white rounded-md` |
| Ghost | Low-emphasis (sidebar items, icon buttons) | `bg-transparent hover:bg-zinc-100` |

All buttons: `h-9 px-4 text-sm font-medium` — consistent height, no large/XL buttons by default.

### Forms

- Labels above inputs, never inline or placeholder-only
- Input style: `border border-zinc-200 rounded-md bg-white text-sm h-9`
- Focus ring: `ring-2 ring-indigo-500 ring-offset-1`
- Helper text: `text-xs text-zinc-500 mt-1`
- Error state: `border-red-500` + red helper text below input
- Form sections: group related fields in a card with `p-6`, title `text-lg font-semibold mb-4`

### Cards

- `bg-white border border-zinc-200 rounded-lg shadow-sm`
- Header (optional): `px-6 py-4 border-b border-zinc-200`
- Content: `p-6`
- No heavy drop shadows — `shadow-sm` only

### Tables

- Header row: `bg-zinc-50 text-xs font-medium text-zinc-500 uppercase tracking-wide`
- Body row: `border-b border-zinc-100 text-sm text-zinc-700`
- Row hover: `hover:bg-zinc-50`
- No external border on the table itself — let the containing card provide the border

### Badges / Status chips

- Small pill: `rounded-full text-xs font-medium px-2 py-0.5`
- Active/Success: `bg-emerald-50 text-emerald-700`
- Pending: `bg-amber-50 text-amber-700`
- Inactive: `bg-zinc-100 text-zinc-600`

---

## 6. Layout Shell (AppShell)

The standard page frame for all authenticated screens.

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (240px, zinc-900)  │  Top bar (56px)        │
│                             │─────────────────────── │
│  Logo                       │                        │
│  ─────────────              │   Page title           │
│  [icon] Dashboard           │                        │
│  [icon] My Profile    ◀ active                       │
│  [icon] Students            │   <page content>       │
│  [icon] Lessons             │                        │
│                             │                        │
│  ─────────────              │                        │
│  [avatar] Robert            │                        │
│  [icon] Logout              │                        │
└─────────────────────────────────────────────────────┘
```

- **Sidebar width:** 240px, fixed, full height
- **Top bar height:** 56px — contains page title (left) and user avatar + logout (right)
- **Main content:** `flex-1 overflow-y-auto p-6 bg-zinc-50`
- **Nav items:** icon (16px) + label, `gap-3`, `py-2 px-3 rounded-md`
- **Active item:** `bg-zinc-800 text-white`
- **Logo area:** `px-6 py-5`, product name in `text-white font-semibold text-lg`

---

## 7. Icon Library

Use **Lucide React** (`lucide-react`) — already included with shadcn/ui. Size default: `h-4 w-4`. Nav icons: `h-5 w-5`.

---

## 8. Component Library

**shadcn/ui** — copy-paste components built on Radix UI + Tailwind CSS.

Components to install for Phase 1:
- `button`, `input`, `label`, `textarea`, `select`
- `card`
- `form` (React Hook Form integration)
- `badge`
- `avatar`
- `separator`
- `toast` (for save confirmations / errors)
- `dialog` (for confirm-delete modals)
- `table`

---

## 9. Implementation Order (T5.1 steps)

1. Install Tailwind CSS + configure `tailwind.config.js` with Inter font and color overrides
2. Install shadcn/ui and add the components listed above
3. Build `AppShell` component (sidebar + top bar layout wrapper)
4. Wire `AppShell` into React Router — all authenticated routes render inside it
5. Restyle Teacher Profile page (T5) using the new components and this spec
6. Playwright smoke test to confirm profile page still works

---

## Approval Checklist

- [ ] Color palette approved
- [ ] Typography approved
- [ ] Layout shell (AppShell) approved
- [ ] Component style direction approved
- [ ] Ready to implement
