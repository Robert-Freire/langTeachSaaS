# LangTeach UX/Style Recommendations

Based on review of all application screens (dashboard, profile, students, lessons, forms).

## Priority Fixes

### High Impact

#### 1. Unify Dropdown Components
Native `<select>` elements (Language, CEFR on student form, Duration on lesson form) clash with custom-styled selects (student dropdown in schedule popover). Replace all native selects with the same custom dropdown component for visual consistency.

#### 2. Add Labels to Lessons Filter Dropdowns
The three "all" dropdowns on the Lessons list page have no visible labels. Users can't tell what each filter controls without clicking. Add inline labels like "Language: all", "Level: all", "Status: all".

#### 3. Standardize Input Widths
Form inputs have inconsistent widths across pages. Short-value fields (dropdowns) should be compact and grouped on the same row. Full-text inputs (Name, Topic, Title) should be full-width within their card. On the Student form, put Language and CEFR Level side-by-side (like the Lesson form already does).

### Medium Impact

#### 4. Move Save/Cancel Buttons Inside Cards
"Save Profile" and "Save Student/Cancel" buttons sit outside their card containers, flush-left. This makes them feel disconnected. Either place them inside the last card (at the bottom), or right-align them. Consider sticky action buttons for long scrollable forms.

#### 5. Differentiate Lesson Templates
Template cards on the New Lesson page all look identical. Give each a subtle background tint (e.g., warm for Conversation, cool for Exam Prep). Add a more pronounced hover state (slight scale + shadow). Use a dashed border for the "Blank" template to signal "start from scratch."

#### 6. Improve Empty Calendar State
When all calendar days are empty, the area looks barren. Add a subtle prompt like "Click + to schedule" or a dashed-border placeholder in the current day's column. The "Needs Preparation" card's "All caught up!" message could use a small checkmark icon or green tint.

### Low Impact (Polish)

#### 7. Card Shadow/Border Unification
Cards use varying border subtlety. The Quick Actions panel uses a slightly different style than list cards. Unify with the same border-radius, border color, and add a subtle `box-shadow: 0 1px 3px rgba(0,0,0,0.08)` to all cards.

#### 8. Sidebar Bottom Section
- Email is truncated with no tooltip. Add a `title` attribute for the full address on hover.
- The green status dot on the avatar has no explanation. Either label it or remove it.
- Add more vertical padding between nav items and the user section.

#### 9. Form Section Headings
Section headings inside cards ("Basic Info", "Interests", "AI Personalization") all look the same. Add a subtle left-accent color or top-border to make them scannable on long forms.

#### 10. Schedule Lesson Popover
Add a small divider or "or" text between "Create New Lesson" and "Assign Existing Draft" to make the two paths clearer.

## Logo/Icon (Implemented)
Added a two-bubble speech icon (teacher + student conversation metaphor) in the brand purple. Applied to:
- Favicon (`public/favicon.svg`)
- Sidebar logo area (next to "LangTeach" text)

The icon uses:
- Front bubble (`#6366f1`, indigo-600) with text lines representing the teacher/content
- Back bubble (`#a5b4fc`, indigo-300) representing the student response
- Three graduated-opacity text lines suggesting structured lesson content
