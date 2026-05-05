# LangTeach SaaS — Design System

**Authoritative reference for all UI work.** Any bot or developer implementing or reviewing a screen must read this first.

Last updated: 2026-05-04

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

### Utility classes

| Class | Definition | Usage |
|-------|-----------|-------|
| `lt-gradient-primary` | `linear-gradient(135deg, #3525CD 0%, #4F46E5 50%, #6366f1 100%)` | All primary CTA buttons, FABs, header icons that use the indigo gradient. Single source of truth — do not inline gradient strings. |

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

**Card micro-action exception:** inline action buttons inside transient AI cards (proposal cards, suggestion cards) may use raw `<button>` elements with hardcoded Tailwind classes instead of the DS Button component variants. These are micro-CTAs scoped to the card lifecycle, not page-level actions. They must still follow DS color tokens and sizing norms (see §11.10 for the canonical proposal card action row spec).

### FAB (Floating Action Button)

A single app-level FAB triggers the Atelier Assistant. There is at most one FAB per screen.

- **Size:** `h-14 w-14` (56px) circular — `rounded-full`
- **Background:** `lt-gradient-primary` (indigo gradient, same as Primary buttons)
- **Shadow:** `shadow-[0_12px_40px_0_rgb(26_27_34_/_0.10),0_4px_16px_0_rgb(53_37_205_/_0.18)]` — glow shadow, not drop shadow
- **Position:** `fixed bottom-6 right-6 z-30`
- **Visibility:** `hidden lg:flex` — desktop only. Mobile uses a button in the top bar.
- **Icon:** Sparkles (`h-5 w-5`) when closed, X (`h-5 w-5`) when open. The swap communicates toggle state without a label.
- **Hover/active:** `hover:brightness-105 hover:shadow-[0_16px_48px_0_rgb(53_37_205_/_0.28)] active:brightness-90`
- **Disabled (no context):** `opacity-50 cursor-not-allowed`
- **Focus:** `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`
- **Accessibility:** always include `aria-label` ("Open Assistant" / "Close Assistant"). Pair with a Tooltip showing the keyboard shortcut.

Do not create secondary FABs. If a second persistent floating trigger is needed, use a fixed-position toolbar, not another FAB.

### Compound Input Bar

Used in the Atelier Assistant panel footer. Combines a mode-toggle icon button, a text input, and a submit CTA in a single `flex items-center gap-2` row.

```
[mic toggle]  [text input ─────────────────]  [send →]
```

- **Mic toggle:** borderless icon button, `text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl`, min 44px touch target. This is **not** a Primary, Secondary, or Ghost DS button variant — it is a mode-toggle that switches the bar into recording state. The ghost-next-to-filled rule in §5 does not apply because the mic is not a CTA on the same semantic level as Send.
- **Text input:** `flex-1 bg-[#F4F2FD] border-0 focus-visible:ring-0 rounded-xl h-10 px-4 text-sm font-inter`
- **Send button:** filled primary gradient (`lt-gradient-primary`), `rounded-xl`, min 44px touch target. Disabled at `opacity-40` when input is empty.
- **When recording:** the entire row is replaced by a waveform + timer + Stop + Cancel row. The input and send button are hidden during recording.

**Role-distinction rule:** the ghost-next-to-filled prohibition in §5 targets same-level CTAs. Mode-toggle controls (mic, record) are exempt because they switch interaction state rather than submit data. When using this exception, the mode-toggle must be visually subordinate (icon-only, muted color at rest) and must not carry primary-action weight.

### Keyboard Shortcut Hint

A `<kbd>` element displayed inside a Tooltip to surface keyboard shortcuts for sidebar CTAs.

```tsx
<TooltipContent>
  Open Assistant <kbd data-slot="kbd">⌘K</kbd>
</TooltipContent>
```

- Place the hint inside `TooltipContent`, not in the button label itself.
- Use only where a keyboard shortcut is genuinely registered (do not document non-existent shortcuts).
- `data-slot="kbd"` is required for correct Tooltip styling.
- Do not add keyboard hints to secondary or destructive actions.

### CEFR Badges

**Valid levels:** A1, A2, B1, B2, C1, C2 only. No sublevel (B2.1) or plus (B2+) notation anywhere in the system. If sublevels are introduced as a product decision, update `CefrConstants.cs` (backend) and `CEFR_LEVELS` in `frontend/src/lib/cefr-colors.ts` first; never introduce sublevel strings ad hoc.

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

### SelectionChip

Toggle-style pill for multi-select groups (Languages I Teach, CEFR Levels, Teaching Style). Unselected: `#F4F2FD` background, no border. Selected: `bg-indigo-600 text-white`. Shape: `rounded-full`, min-height 36px.

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

### Responsive Icon-Only Labels

When a toolbar or header row contains buttons that should collapse to icon-only at narrow breakpoints, use one of two canonical forms depending on density.

**Dense header rows (3 or more buttons side by side):** `md:hidden lg:inline`
- Collapses to icon-only at `md` (768px), shows label from `lg` (1024px)
- Use when the row would overflow at `md` with all labels visible
- Example: student detail header (`StudentDetailHeader.tsx`)

**Single-button or sparse toolbars:** `hidden sm:inline`
- Shows icon-only below `sm` (640px), shows label from `sm`
- Use for isolated action buttons that have ample row space at most sizes
- Example: CourseDetail toolbar, LessonEditor preview button

Never mix these forms for buttons that appear in the same row. Pick the form that matches the density of the densest row where the button appears.

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

**One Done per screen:** do not place a second Done in a sticky section nav if the page header already shows one. The sticky nav may repeat Done only if the page header Done has scrolled fully out of view (i.e., the sticky row is the only visible exit path). When both are simultaneously visible, remove the sticky one.

**Competing top-right affordances:** do not place two distinct action buttons at the top-right of the same screen across adjacent rows. A "Create Course" shortcut in the page header row and a "Done" button in the sticky nav row one pixel below create two competing exit affordances. If a contextual shortcut (e.g. "Create Course") belongs on the edit screen, place it in the page body near the relevant section, not at top-right.

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

**Interactive vs. ambient animations.** The 300ms cap applies to **interaction-response animations** (hover states, expand/collapse, click feedback). **Ambient state animations** (processing pulses, loading indicators, streaming cursors) are exempt from the cap -- they communicate ongoing background state, not user-action feedback. Ambient animations must still have purpose and should loop smoothly with `ease-in-out`. Example: `extraction-pulse` at 2.8s total is acceptable because it signals a background extraction process, not a user-triggered state change.

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

#### Proposal Card Accent Palette

Each AI proposal type has a fixed accent color used for the left-edge accent bar, the icon background, and the icon color. Do not reuse these tokens outside proposal cards.

| Proposal type | Accent bar | Icon bg | Icon color | Semantic meaning |
|---------------|-----------|---------|-----------|-----------------|
| `student` | `bg-indigo-500` | `bg-indigo-100` | `text-indigo-600` | Update to an existing student field |
| `session` | `bg-violet-500` | `bg-violet-100` | `text-violet-600` | Update to an existing session field |
| `todo` | `bg-emerald-500` | `bg-emerald-100` | `text-emerald-600` | New teaching todo |
| `newStudent` | `bg-teal-500` | `bg-teal-100` | `text-teal-600` | Create a new student record |
| `newSession` | `bg-amber-500` | `bg-amber-100` | `text-amber-600` | Schedule a new session |

Reference implementation: `ProposalCard.tsx` `TYPE_CONFIG`.

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

### 11.7 Toggle Pill Chips (Settings Language / CEFR)

Used for toggle selections on the Settings page (interface language, CEFR level). Not to be confused with enter-to-add Interests chips.

- **Shape:** `rounded-full px-3 py-1 text-sm font-medium`
- **Selected:** `bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300`
- **Unselected:** `bg-zinc-100 text-zinc-600 hover:bg-zinc-200`
- No border on unselected state (DS no-line rule). Ring on selected communicates active state without a decorative line.
- CEFR chips: single-select (only one active at a time). Language chips: follow the field's cardinality.

### 11.8 Compact Row Clickability Signal (Chevron)

For any list row that navigates or expands on click, a trailing chevron is required as a passive affordance signal. Hover state alone is insufficient -- it is invisible to new users and absent on mobile.

Use the parent `group` class and `group-hover:text-zinc-600 transition-colors` on the chevron icon.

**Navigation rows** (click takes the user to a new page or detail view):
- **Icon:** `<ChevronRight />` from `lucide-react`, `w-4 h-4`, `ml-auto`
- Static -- does not change on expand/collapse.

**Expand/collapse rows** (click reveals inline detail below the row):
- **Icons:** `<ChevronDown />` when collapsed, `<ChevronUp />` when expanded, `w-4 h-4`
- The icon change itself communicates expanded state; no separate affordance needed.
- Example: session history compact rows.

Both patterns:
- **Color:** `text-zinc-400` at rest, `text-zinc-600` on row hover (`group-hover:text-zinc-600 transition-colors`)
- **Transition:** `transition-colors` (150ms, matches DS default)

### 11.9 Drawer Footer Button Pairing

All drawer footers (side drawers overlaying the screen) use this exact button pairing in the footer action row:

- **Cancel:** `<Button variant="ghost" size="sm">Cancel</Button>` -- ghost style, dismisses without saving
- **Primary action:** `<Button size="sm">` (default variant, filled primary) -- confirms/saves the operation
- **Layout:** `flex items-center justify-end gap-3` row, Cancel left of primary action
- **Disabled state:** Primary action disabled while saving; Cancel also disabled while saving to prevent double-dismiss
- The primary action label describes the operation (e.g. "Save 3 changes", "Create student"), not a generic "Save"

### 11.10 Proposal Card Action Row (Apply / Dismiss / Modify)

AI proposal cards in the Atelier Assistant panel show up to three actions on the bottom of the card.

**Button styles (not DS Button component variants — these are inline `<button>` elements):**

| Action | Style | When visible |
|--------|-------|-------------|
| Apply | `text-white bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold px-3 py-1 rounded-lg` | `proposed` status only |
| Dismiss | `text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 text-xs font-semibold px-3 py-1 rounded-lg` | `proposed` status only |
| Modify | `text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-semibold px-3 py-1 rounded-lg` | `proposed` status, not `newStudent` or `newSession` types |
| Undo | same style as Apply | `applied` status only |
| Retry | same style as Apply | `error` status only |
| Save / Cancel | Apply / Dismiss styles respectively | While editing (after Modify) |

**Status pills** (top-right of card header, not action buttons):

| Status | Style |
|--------|-------|
| Applied | `bg-emerald-100 text-emerald-700 text-[0.625rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full` |
| Dismissed | same shape, `bg-zinc-100 text-zinc-400` |
| Error | same shape, `bg-red-100 text-red-600` |

**`newStudent` and `newSession` types** use payload editing fields (date input, NewStudentFields) instead of a Modify button. They always require Apply to commit.

Reference implementation: `ProposalCard.tsx`.

### 11.11 Inline Discard Confirm

Used inside the Atelier Assistant Sheet panel when the user attempts to close with unsaved proposals. Replaces any browser-native `confirm()` call.

```tsx
<div className="mx-4 mb-3 px-4 py-3 rounded-xl bg-amber-50 flex items-center justify-between gap-3 shrink-0">
  <span className="text-sm font-inter text-zinc-700 flex-1">Close and discard?</span>
  <div className="flex items-center gap-2">
    <button className="text-sm font-inter font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50">
      Discard
    </button>
    <button className="text-sm font-inter font-medium text-zinc-500 hover:text-zinc-700 px-2 py-1 rounded-lg hover:bg-zinc-100">
      Keep editing
    </button>
  </div>
</div>
```

- Background: `bg-amber-50` signals mild caution (not an error, not a destructive confirm).
- Always inline in the panel — never a floating modal or browser dialog.
- Destructive action (Discard) is red text, non-destructive (Keep editing) is zinc text.
- Do not add a header or icon — the `bg-amber-50` background and the question text provide sufficient context.
- This pattern applies to any panel that captures unsaved work. Use `bg-amber-50` consistently.

Reference implementation: `AtelierAssistantPanel.tsx` `pendingClose` state.

### 11.12 Transcription Blockquote

Displays the verbatim transcript of the teacher's recorded speech before the AI processes it.

```tsx
<blockquote className="border-l-2 border-indigo-300 pl-3 italic text-sm font-inter text-zinc-700">
  {transcription}
</blockquote>
```

- **Use only for verbatim content returned from the speech-to-text service.** Never use for AI-generated summaries, proposals, or synthesized text.
- The left border (`border-l-2 border-indigo-300`) and italic style signal "this is the teacher's own words."
- Do not add a quotation mark or attribution label — the context (transcription view) is sufficient.
- Accessibility: use the `<blockquote>` element (not a `<div>`) so screen readers announce it as a quotation.

Reference implementation: `AtelierAssistantPanel.tsx` `transcription-block` test id.

### 11.13 Live-Status Indicator

Used in panel headers where the background processing state needs to be passively visible without interrupting the teacher.

```tsx
<div role="status" aria-label={processing ? 'Status: Processing' : 'Status: Ready'}>
  <span className={processing
    ? 'h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse'
    : 'h-2 w-2 rounded-full bg-emerald-500 shrink-0'}
    aria-hidden="true"
  />
  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter">
    {processing ? 'Processing Insight' : 'Ready'}
  </span>
</div>
```

- Two states only: **Ready** (emerald dot, label "Ready") and **Processing** (amber dot, `animate-pulse`, label "Processing Insight").
- Wrap in `role="status"` with a descriptive `aria-label` so screen readers announce state changes.
- Mark the dot `aria-hidden="true"` — the label text carries the semantic meaning.
- Use Label-SM scale (`text-[0.6875rem]`), all-caps, `text-zinc-400` (muted — not the primary reading focus).
- Do not add a third state (error, warning, etc.) to this indicator. Errors surface via inline error UI in the content area.

Reference implementation: `AtelierAssistantPanel.tsx` panel header.

### 11.14 Inline Mini-Form Inside Proposal Card

`newSession` and `newStudent` proposal types embed editable fields directly inside the card body instead of showing plain text. This is the only permitted use of form inputs inside a list item or card.

**When to use:** only on proposal cards for types that require structured input before they can be applied. Do not use for editing already-applied data.

**Rules:**
- Field labels above the input (consistent with §5 Form Inputs).
- Use `<input type="date">` or `<Input>` from `@/components/ui/input`, never a raw `<input>` outside of date pickers.
- Edits commit via `onEditPayload` callback (equivalent to Pattern A autosave-on-blur semantics for this transient context).
- Do NOT show `<SavedIndicator />` — the card is transient; Apply is the commit action.
- Disabled state during non-editable statuses: `cursor-not-allowed opacity-60`.
- Date input style: `text-sm font-inter border border-zinc-200 rounded-md px-2 py-0.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-300`.

Reference implementation: `ProposalCard.tsx` (newSession date input, `NewStudentFields.tsx`).
