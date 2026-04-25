# LangTeach SaaS — Design System

**Authoritative reference for all UI work.** Any bot or developer implementing or reviewing a screen must read this first.

Last updated: 2026-04-16

---

## 1. Design Direction

**Theme: "Academic Atelier" (The Digital Curator)**

LangTeach is a tool for independent language teachers — professionals managing complex student relationships. The UI must feel like a high-end, bespoke workspace: authoritative, warm, and breathable. It is NOT a dashboard, NOT a school admin panel, NOT a consumer app.

Reference benchmark: a well-curated editorial tool. Think high-quality stationery, not SaaS boilerplate.

**Three principles that override everything else:**
- The teacher has 10 minutes before class. Every screen must answer its core question in under 60 seconds.
- Show, don't explain. If a UI element needs a tooltip to be understood, the UI is wrong.
- Consistency is kindness. Breaking rhythm breaks trust. If cards have a certain padding in one screen, they have it everywhere.

---

## 2. Color Palette

### Core tokens

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#3525CD` | Primary CTAs, active nav indicators, indigo accents |
| `primary-container` | `#4F46E5` | Gradient endpoint for primary buttons |
| `tertiary` | `#7E3000` | Warm encouragement, premium features ("leather-bound book" warmth) |
| `on-surface` | `#1A1B22` | All body text — never use pure black `#000000` |
| `error` | `#BA1A1A` | Error states — urgent but professional, not alarming |

### Surface hierarchy (tonal layering — no borders)

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#FBF8FF` | Main app canvas / page background |
| `surface-container-low` | `#F4F2FD` | Secondary sidebars, section backgrounds |
| `surface-container-lowest` | `#FFFFFF` | Active workspace, main cards |
| `outline-variant` | `#C7C4D8` | Ghost borders (accessibility only, at 20% opacity max) |

### The No-Line Rule

**Borders between sections are forbidden.** Layout boundaries must be defined only through background color shifts (tonal layering). Exception: input fields may use `outline-variant` at 20% opacity for accessibility. Never use 1px solid borders to section content.

### Floating elements (modals, dropdowns)

Use glassmorphism: `surface-container-lowest` at 80% opacity + `backdrop-blur: 12px`.

---

## 3. Typography

Two fonts, used together deliberately.

| Font | Role | Usage |
|------|------|-------|
| **Manrope** | Display / Headline | Section headers, card titles, empty state moments of delight |
| **Inter** | UI / Body | All body text, form fields, navigation labels, metadata |

### Type scale

| Role | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| Display-LG | Manrope | 3.5rem | — | Empty states, "moment of delight" screens |
| Headline-MD | Manrope | 1.75rem | — | Dashboard section headers |
| Title-SM | Inter | 1rem | Medium | Card titles, navigation labels |
| Body-MD | Inter | 0.875rem | — | Student notes, curriculum descriptions, all body text |
| Label-SM | Inter | 0.6875rem | All-caps, 0.05em tracking | CEFR indicators, metadata chips |

Text color: always `on-surface` (`#1A1B22`). Never `#000000`.

---

## 4. Elevation and Depth

Depth comes from tonal layering, not shadows.

- A `surface-container-lowest` (#FFF) card on a `surface-container-low` (#F4F2FD) background creates natural "lift" — no shadow needed.
- For high-priority floating elements (student quick-view, modals): ambient shadow with `blur: 40px`, `y: 12px`, 6% opacity using `on-surface`. Feels like a soft glow, not a drop shadow.
- **Overlapping elements are encouraged.** Let a card slightly overlap a header background to create three-dimensional space.

---

## 5. Components

### Buttons

| Variant | When to use | Style |
|---------|------------|-------|
| Primary | Single main CTA per screen (Log Session, Save, Create) | Indigo gradient (`primary` → `primary-container`) at 135°, white text, `xl` (0.75rem) radius |
| Secondary | Supporting actions on the same row as Primary (Edit Student) | `surface-container-high` background, `primary` text, no border |
| Ghost | Low-emphasis icon buttons, sidebar items | Transparent background, `surface-container-low` on hover |
| Destructive | Irreversible actions (Delete) | `error` color, confirm before executing |

**Rule:** Primary and Secondary buttons on the same row must belong to the same visual family. A ghost button next to a filled primary is not allowed — use Secondary instead.

All buttons: consistent height, no XL or oversized variants unless it's a full-width CTA on an empty state.

### CEFR Badges

Square-format badge with `md` (0.375rem) radius — not pill-shaped.

| Level | Color token |
|-------|------------|
| A1, A2 | `secondary-container` (passive/learning) |
| B1, B2 | `primary-fixed` (active/growing) |
| C1, C2 | `tertiary-fixed` (mastery/professional) |

Text: `Label-SM` bold (e.g. "B2").

### Cards and Lists

- No divider lines between list items.
- Separation via 16px vertical gap.
- List item hover: background shifts to `surface-container-highest` with `lg` (0.5rem) radius.

### Form Inputs

- Fill: `surface-container-lowest`.
- Border: ghost border at 20% opacity only (accessibility). No full-opacity borders.
- Focus: background stays white, ambient shadow increases slightly to "bring the field forward."
- Labels: always above the input, never inline or placeholder-only.
- Helper text: below the field, `Label-SM` in muted color.

### Vocabulary Chips / Tags

- Background: `secondary-fixed-dim`, text: `on-secondary-fixed`.
- Shape: `full` (9999px) roundedness — contrasts against the more architectural cards.

---

## 6. Layout Shell

All authenticated screens render inside the AppShell: a fixed sidebar (left) + main content area (right).

- **Sidebar:** fixed width, `surface-container-low` background, Manrope logo area, Inter nav labels.
- **Main content:** `flex-1 overflow-y-auto`, `surface` background, generous left/right margins.
- **Asymmetric margins encouraged:** if left margin is 40px, try 64px right for editorial feel.
- **Active nav item:** primary color indicator, not a background fill.

---

## 7. Icons

**Lucide React** (`lucide-react`). Default size: `h-4 w-4`. Navigation: `h-5 w-5`.

---

## 8. Interaction Patterns

> These rules apply to every screen, new and existing. When building a UI, pick the correct pattern from below. Mixing patterns on the same screen for the same type of action is not allowed.

### 8.1 The Three Permitted Edit/Save Patterns

---

**Pattern A — Autosave on blur** (single-value fields)

Use for: text inputs, textareas, selects, date pickers, CEFR level selectors — any field holding one value.

- Saves when the teacher clicks or tabs away (on blur).
- No Save button. No Cancel button.
- On save: show `<SavedIndicator />` (see 8.2), then hide after 1.5 seconds.
- The teacher navigates away freely. There is no "unsaved changes" warning for single-value fields.

Examples: Edit Student screen (all fields), Motivation banner, session title in inline edit.

---

**Pattern B — Immediate add for growing lists**

Use for: chip inputs, todo lists, followup lists, learning goals, interest tags — any field that appends items.

- A persistent (or one-tap-to-reveal) input is always accessible.
- Item adds on Enter or a dedicated "+" / "Add" button.
- Item appears immediately in the list.
- Items removed with a × or delete icon per item.
- No Save button. No Cancel button. No edit mode toggle.

Examples: Teaching Todos / Ideas para Clases, Pending Followups, Interests chips, Learning Goals.

---

**Pattern C — Full-page edit form with Done**

Use for: dedicated edit screens covering many fields at once.

- All fields are editable simultaneously.
- Each field uses Pattern A (autosave on blur) internally.
- A single "Done" button (top right) navigates back. It is NOT a save trigger — saves have already happened field-by-field on blur.
- No per-field or per-section Save/Cancel buttons.

Examples: `/students/:id/edit`, `/sessions/:id/edit`.

---

### 8.2 SavedIndicator Component

Every Pattern A save must show this feedback. Without visible confirmation, autosave creates anxiety.

- **Location:** inline at the right edge of the field, or in the section card header.
- **Content:** checkmark icon + "Saved" label in `Label-SM` muted color.
- **Animation:** fade in 200ms ease-out → hold 1s → fade out 300ms.
- **Implementation:** one shared `<SavedIndicator />` component. Never duplicate the logic.

---

### 8.3 Session Row Inline Edit

Sessions are edited inline in their expanded row. No modal, no separate edit page, no kebab for edit.

- Click row to expand.
- In expanded state, fields (title, narrative, duration, next-class plan) become editable inputs (Pattern A each).
- Collapsing the row triggers save.
- Delete is accessible via a destructive icon in the expanded state or a confirmation prompt — never the primary affordance.
- Double-click to edit is not permitted (too hidden for a professional tool).

> **Overflow fields:** The full-page session editor (`/sessions/:id/edit`) remains accessible for fields not yet inline-editable (topic tags, homework assigned, level reassessment, session status, voice notes, teaching todos, followups). A link to it may appear at the bottom of the expanded row. When the link covers only 1-3 specific fields, its label should name them ("Edit topic tags & homework"). When the editor covers many fields, a general label ("Open full session") is acceptable. The label must never imply the inline edit is partial or incomplete. As fields migrate inline, the link scope shrinks and is eventually removed.
>
> **Escape-hatch styling:** Style this link as a ghost button (transparent background, `text-indigo-600`, hover `#F4F2FD`). This is intentional and does not conflict with §8.3 — the ghost button is a low-prominence secondary affordance that makes the full editor discoverable without competing with the inline-edit fields.

---

### 8.4 What Is Explicitly Not Allowed

- Save/Cancel button pairs on inline edits within detail screens.
- Kebab menus containing only Edit + Delete. If Edit is the primary action, it must be directly accessible via a hover-reveal icon or the expanded state. Kebabs are for 3+ secondary actions.
- Per-section Save buttons on full-page edit forms (Pattern C).
- Mixing Pattern A and Pattern B on fields of the same semantic type on the same screen.

---

## 9. Empty States

- Use `Display-LG` Manrope for the headline — this is a "moment of delight," not a dead end.
- Include one clear call to action (Primary button or link).
- Never show a blank white card with no content and no guidance.
- "No results for X" states: show the search term back to the user, offer to clear the filter.

---

## 10. Motion

- Transitions must communicate state changes, not decorate.
- Default transition: 150ms ease-out on expand/collapse, hover states.
- No animation is better than gratuitous animation.
- Avoid transitions longer than 300ms for any interactive element.

---

## 11. Cross-Screen Control Specifications

> These specs are **binding**. Every bot implementing or modifying a screen must use these exact controls. Do not invent new variants. If a control is not listed here, check existing screens for the pattern before creating something new.

### 11.1 List-Add Controls (Pattern B visual spec)

All growing lists (todos, followups, interests, goals) use the same structural pattern:

- **Input:** `<Input>` component from `@/components/ui/input` (never raw `<input>`), tinted background matching the list's color family.
- **Add trigger:** Enter key AND a filled icon button with `<Plus>` icon (no text label, icon only).
- **Button style:** `rounded-lg`, filled with the list's accent color, `p-1.5`.
- **Layout:** input and button in a `flex gap-2` row.
- **Placeholder:** use the canonical placeholder for each list type (see 11.3).

### 11.2 Color Families

Each list type has a fixed color family. Use these exact values everywhere the list appears.

| List type | Input bg | Button bg | Container bg (when used) | Accent color |
|-----------|----------|-----------|--------------------------|-------------|
| Teaching Todos | `bg-indigo-50` | `bg-indigo-600` | `#F0EFFF` | indigo |
| Followups | `bg-amber-50` | `bg-amber-500` | `#FFFBEB` | amber |
| Interests | `bg-white` | n/a (Enter-to-add) | n/a | indigo chips |

### 11.3 Canonical Placeholders and Labels

| Concept | Placeholder | Section label | DB field |
|---------|-------------|---------------|----------|
| Teaching Todos | "Add a teaching idea..." | "Teaching Todos" | `teachingTodos` (student) |
| Followups | "Add followup..." | "Pending Followups" | `followups` (separate entity) |
| Session notes | n/a | "Notes" (never "Today's Context") | `generalNotes` |
| Next session | n/a | "Next Session Plan" | `nextSessionTopics` |
| Cancelled toggle | n/a | "Cancelled" (not under a "Status" heading) | `isCancelled` |

### 11.4 Item Lifecycle Controls

Todos and followups have statuses. The visual indicator for each status must be identical across every screen.

**Teaching Todos:**

| Status | Toggle control | Text style |
|--------|---------------|------------|
| Pending | Square button `w-4 h-4 rounded border-2 border-indigo-400`, empty | Normal `text-[#1A1B22]` |
| Covered | Square button `w-4 h-4 rounded border-2 bg-green-500 border-green-500`, white check icon | `line-through text-zinc-400` |
| Dismissed | Square button `w-4 h-4 rounded border-2 border-zinc-300 bg-zinc-100`, empty | `line-through text-zinc-400` |

Reference implementation: `TeachingTodosCard.tsx`.

**Followups:**

| Status | Toggle control | Text style |
|--------|---------------|------------|
| Pending | Circle `w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-100` | Normal `text-[#1A1B22]` |
| Done | Circle `w-3 h-3 rounded-full bg-emerald-500`, no border | `line-through text-zinc-500`, reduced opacity |

Reference implementation: `StudentFollowupsCard.tsx`.

**Rules:**
- Never use native HTML `<input type="checkbox">` for todo or followup items. Always use the custom toggle controls above.
- LogSession left panel must use these same controls when displaying existing items to check off.
- When an item is checked in a transactional context (LogSession), show the completed visual immediately (green fill for todos, emerald for followups). The helper text below the list communicates that the status change commits on Done.

### 11.5 Toggle Switches

One size, everywhere. Do not create local toggle switch components.

- **Dimensions:** `h-6 w-11` track, `h-4 w-4` thumb.
- **Colors:** active `bg-indigo-600`, inactive `bg-zinc-300`.
- **Focus ring:** `focus-visible:ring-2 focus-visible:ring-indigo-600`.
- **Thumb position:** inactive `translate-x-1`, active `translate-x-6`.

The LogSession local `ToggleSwitch` component (`h-5 w-9`, thumb `h-3.5 w-3.5`) must be replaced with these dimensions or use a shared component.

### 11.6 LogSession Staging Exception

LogSession stages new todos and followups locally before committing on Done. This is the only behavioral difference from other screens. Visual rules:

- The **add input row** must still follow 11.1 (same `<Input>`, same filled Plus button, same color family).
- New items (not yet committed) are displayed as plain text with an X remove button. They do not have status toggles because they are always pending by definition.
- Existing items (from the left panel) use the full lifecycle controls from 11.4.
- The colored container backgrounds (`#F0EFFF` for todos, `#FFFBEB` for followups) are permitted in LogSession to visually separate the "new items" area from the form fields.
