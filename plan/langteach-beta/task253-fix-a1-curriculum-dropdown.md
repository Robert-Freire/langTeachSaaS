# Task #253 - Fix Empty Curriculum Template Dropdown for A1

## Problem Analysis

**Root cause:** Race condition in `CourseNew.tsx`. The template query has:
```javascript
enabled: useTemplate && !!targetCefrLevel && mode === 'general'
```

This means templates are only fetched **after** the user checks "Use curriculum template". When the user checks the box and immediately opens the dropdown, `allTemplates` is `undefined` (query still loading) and `templates = []` - resulting in an empty dropdown.

This affects ALL levels the first time, but A1 is the most basic level teachers try first, so they discover it there.

**Backend confirmed working:** All 10 `CurriculumTemplateServiceTests` pass. A1 templates (A1.1, A1.2, A1.3) are correctly embedded and returned by the API with `cefrLevel: "A1"`.

**Frontend filter confirmed correct:** `allTemplates.filter(t => t.cefrLevel === targetCefrLevel)` is logically sound once data is available.

**Missing coverage:** No unit test or e2e test exercises the A1 template path. Existing tests only use B1 mock data.

## Fix Plan

### 1. Prefetch templates when CEFR level is selected (`CourseNew.tsx`)

Change:
```javascript
enabled: useTemplate && !!targetCefrLevel && mode === 'general',
```
To:
```javascript
enabled: !!targetCefrLevel && mode === 'general',
```

This starts fetching templates as soon as the user selects a CEFR level, so data is ready (or close to ready) when they check the checkbox. No wasted fetches - templates are only a few KB and cached by React Query.

### 2. Add loading state to template dropdown

While templates are loading, show a disabled select with "Loading templates..." text, not a silently empty dropdown.

Extract the `isPending` state from the query:
```javascript
const { data: allTemplates, isPending: templatesLoading } = useQuery({...})
```

In the template Select:
```jsx
<Select disabled={templatesLoading} ...>
  <SelectTrigger>
    <SelectValue placeholder={templatesLoading ? 'Loading templates...' : 'Select a template'} />
  </SelectTrigger>
  ...
</Select>
```

### 3. Add unit test for A1 template filtering (`CourseNew.test.tsx`)

Add a test that:
1. Mocks A1 templates (level: 'A1.1', cefrLevel: 'A1')
2. Selects A1 as CEFR level
3. Checks "Use template"
4. Opens the template select
5. Expects A1.1 to appear as an option

### 4. Extend e2e test for A1 (`courses.spec.ts`)

Add an A1 template creation test alongside the existing B1 test to prevent regression.

## Files to Change

- `frontend/src/pages/CourseNew.tsx` - fix enabled condition + loading state
- `frontend/src/pages/CourseNew.test.tsx` - add A1 template test
- `e2e/tests/courses.spec.ts` - add A1 e2e test

## Acceptance Criteria Mapping

- [x] A1 templates appear in dropdown (fix: prefetch + loading state ensures data is ready)
- [x] All other CEFR levels also populate (fix applies to all levels)
- [x] Unit test covering template filtering logic (new A1 unit test)
