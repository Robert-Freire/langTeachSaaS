# Design System Specification: The Academic Atelier

## 1. Overview & Creative North Star: "The Digital Curator"
To design for the independent educator is to balance the rigor of academia with the warmth of a personal mentorship. This design system moves away from the "cold dashboard" aesthetic of traditional SaaS, instead adopting a **Creative North Star** we call **"The Digital Curator."**

The experience should feel like a high-end, bespoke workspace—an atelier for language. We achieve this by rejecting the rigid, boxy constraints of standard bootstrap layouts. Instead, we use **intentional asymmetry**, wide margins (generous whitespace), and a **tonal layering system** that favors depth over lines. The goal is a "breathable" interface that reduces cognitive load for teachers managing complex student data.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
We use a sophisticated palette where **Indigo (#3525CD)** provides the intellectual spark and **Zinc-inspired neutrals** provide the canvas.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Layout boundaries must be defined solely through background color shifts or subtle tonal transitions.
*   **Surface Hierarchy:** 
    *   Main App Canvas: `surface` (#FBF8FF)
    *   Secondary Sidebars/Sections: `surface-container-low` (#F4F2FD)
    *   Active Workspace/Main Cards: `surface-container-lowest` (#FFFFFF)
*   **The Glass & Gradient Rule:** For floating elements (modals, dropdowns), use Glassmorphism. Apply `surface-container-lowest` at 80% opacity with a `backdrop-blur` of 12px.
*   **Signature Textures:** Use a subtle linear gradient on Primary CTAs: `primary` (#3525CD) to `primary-container` (#4F46E5) at 135 degrees. This adds a "lithographic" quality to the buttons, making them feel tactile rather than flat.

---

## 3. Typography: The Editorial Scale
We pair **Manrope** (Display/Headline) with **Inter** (UI/Body) to create an authoritative yet modern editorial feel.

*   **Display-LG (Manrope, 3.5rem):** Reserved for "Moment of Delight" screens or empty states.
*   **Headline-MD (Manrope, 1.75rem):** Use for dashboard section headers. The wider tracking of Manrope provides a premium feel.
*   **Title-SM (Inter, 1rem, Medium):** The workhorse for card titles and navigation labels. 
*   **Body-MD (Inter, 0.875rem):** Standardized for all student notes and curriculum descriptions.
*   **Label-SM (Inter, 0.6875rem, All Caps, 0.05em tracking):** Used for CEFR indicators and metadata.

---

## 4. Elevation & Depth: Tonal Layering
We convey hierarchy through **Tonal Layering** rather than structural lines. 

*   **The Layering Principle:** Depth is achieved by stacking tiers. A `surface-container-lowest` (#FFFFFF) card sits on a `surface-container-low` (#F4F2FD) background. This creates a natural "lift" that mimics high-quality stationery.
*   **Ambient Shadows:** For high-priority floating elements (like a student profile quick-view), use a shadow with `blur: 40px`, `y: 12px`, and an opacity of 6% using the `on-surface` (#1A1B22) color. It should feel like a soft glow, not a drop shadow.
*   **The Ghost Border Fallback:** If a border is required for accessibility (e.g., input fields), use `outline-variant` (#C7C4D8) at **20% opacity**. Never use 100% opaque borders.

---

## 5. Components: The Polished Productivity Suite

### Buttons
*   **Primary:** Indigo gradient (`primary` to `primary-container`), white text, `xl` (0.75rem) roundedness.
*   **Secondary:** `surface-container-high` background with `primary` text. No border.
*   **Ghost:** Transparent background. On hover, shift to `surface-container-low`.

### CEFR Badges (A1-C2)
Instead of standard pill shapes, use a **square-format badge** with `md` (0.375rem) corners.
*   **A-Level:** `secondary-container` (Passive/Learning)
*   **B-Level:** `primary-fixed` (Active/Growing)
*   **C-Level:** `tertiary-fixed` (Mastery/Professional)
*   *Note:* Use `label-sm` bold for the text (e.g., "B2").

### Form Inputs
*   **Field Style:** Use a `surface-container-lowest` fill. Instead of a bottom line or full box, use a "subtle bracket" effect or a Ghost Border (20% opacity).
*   **States:** On focus, the background remains white but the ambient shadow increases slightly to "bring the field toward the user."

### Cards & Lists
*   **Prohibition:** No divider lines between list items.
*   **Separation:** Use a `16px` vertical gap. For list items, use a hover state that changes the background to `surface-container-highest` with a `lg` (0.5rem) corner radius.

### Contextual Components for LangTeach
*   **The Lesson Timeline:** A vertical track using `surface-container-high` as the "thread" and `primary` dots for completed units.
*   **Vocabulary Chips:** Use `secondary-fixed-dim` backgrounds with `on-secondary-fixed` text. These should have `full` (9999px) roundedness to contrast against the more architectural cards.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical margins. If the left margin is 40px, try a 64px right margin for a custom, editorial feel.
*   **Do** use `tertiary` (#7E3000) for "Warm Encouragement" or premium features—it adds a "leather-bound book" warmth to the indigo system.
*   **Do** prioritize "Overlapping Elements." Let a card slightly overlap a header background to create a sense of three-dimensional space.

### Don’t:
*   **Don’t** use pure black (#000000). Always use `on-surface` (#1A1B22) for text to maintain the "warm zinc" aesthetic.
*   **Don’t** use default 1px dividers. If you must separate content, use a 4px wide `surface-container-low` gap.
*   **Don’t** use high-saturation reds for errors. Use the `error` (#BA1A1A) token which is calibrated to feel urgent but professional, not "alarming."

---

## 7. Text Truncation

Truncation is a last resort, not a default. The Academic Atelier aesthetic values breathing room and information density over hiding content. Apply these rules consistently so the teacher always knows what they are and are not seeing.

### The escape hatch rule

**Never clamp text without a clear escape.** A teacher who sees "tambien el lo de..." with no way to read the rest has been given worse information than no preview at all. Every truncated element must satisfy at least one of:

*   **Expandable in place:** clicking the element (or a chevron) reveals the full content inline.
*   **Navigable:** the row or card is a clickable link to a screen where the full content is visible.
*   **Tooltipped:** the full text appears on hover (only for short labels, never for multi-sentence content).

### Rules by context

| Context | Rule | Tailwind |
|---------|------|----------|
| List row title (expandable row) | Single line, clip at container edge | `truncate` |
| List row title (navigable row) | Up to 2 lines before clipping | `line-clamp-2` |
| List row subtitle / snippet | Up to 2 lines | `line-clamp-2` |
| Dedicated card (single subject, not a list) | No clamping. Let content flow. | none |
| Compact label / chip / badge | Single line, clip at container edge | `truncate` |
| Short metadata (homework, tags) | Use CSS truncation, not JS slice | `truncate` or `line-clamp-1` |

### What not to do

*   **Don’t** apply `line-clamp-*` to a dedicated card that has no "view more" affordance.
*   **Don’t** use JavaScript string slicing (`str.slice(0, 40) + ‘...’`) for truncation. Use `line-clamp-1` or `truncate` so the browser handles it and it responds to container width.
*   **Don’t** mix `truncate` and `line-clamp-*` on sibling elements within the same card — pick one strategy per card type and apply it consistently.
*   **Don’t** apply `truncate` to a flex child without `min-w-0` on its parent. Without `min-w-0`, the flex item will not shrink and truncation will silently fail.