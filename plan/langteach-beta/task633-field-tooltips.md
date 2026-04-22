# Task 633: Field Tooltip System for Student Profile

## Goal
Surface pedagogical context from the field guide as (i) tooltips on the student form, helping teachers understand each field without leaving the page.

## AC Summary
- Tooltip data file covers all fields from sections 1-4 of the field guide (23 fields)
- `short` text: one sentence, English, from the "Que es" line
- `detail` text: cross-field relationships
- `relatedFields` populated for connected fields
- `FieldTooltip` component: shadcn Tooltip with (i) icon, Stitch tonal layering
- Tooltips on StudentForm (create + edit)
- No tooltips on dashboard, student list, detail view
- Data file importable as module

## Approach

### 1. Tooltip data file: `frontend/src/data/field-tooltips.ts`

TypeScript module exporting a record keyed by fieldKey. Each entry has: fieldKey, label, short, detail, relatedFields, sourceGuide. All 23 fields from sections 1-4. Written in English (matching UI chrome language).

### 2. FieldTooltip component: `frontend/src/components/FieldTooltip.tsx`

- Props: `fieldKey: string`
- Looks up tooltip data by key
- Renders small `(i)` icon in `outline-variant` color (zinc-400)
- On hover: shows `short` text via shadcn Tooltip
- Stitch style: white bg, ambient shadow, no borders (override default dark tooltip)

### 3. Integration on StudentForm.tsx

Add `<FieldTooltip fieldKey="...">` next to every field label. Fields currently in the form:
- name, learningLanguage, cefrLevel (Basic Info card)
- interests (Interests card)
- nativeLanguages, learningGoals, weaknesses, difficulties (Teaching Context card)
- personalNotes, teachingNotes (Notes card)

Fields NOT in the form (birthYear, profession, country/city, reason, officialCefrLevel, skillLevelOverrides, shortTermObjectives, teachingTodos, isActive, isCorporate, rate, spokenLanguages) get entries in the data file but no tooltip rendered.

### 4. Tests

- Unit test for FieldTooltip component (renders icon, shows tooltip on hover)
- Unit test for field-tooltips data (all expected keys present, all have short+detail)

## Files Changed
- NEW: `frontend/src/data/field-tooltips.ts`
- NEW: `frontend/src/components/FieldTooltip.tsx`
- NEW: `frontend/src/components/FieldTooltip.test.tsx`
- EDIT: `frontend/src/pages/StudentForm.tsx` (add FieldTooltip next to labels)

## Out of Scope
- Tooltips on detail/list/dashboard views
- Click-to-expand detail panel
- Localization
- Chat agent integration
