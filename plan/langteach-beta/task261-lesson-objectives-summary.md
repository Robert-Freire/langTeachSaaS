# Task #261: Lesson Objectives Summary in Editor Header

## Goal
Add a read-only pedagogical objectives summary to the lesson editor header, showing what grammar/vocabulary/communicative skills the lesson practices. Hidden for standalone lessons (no objectives).

## Current State
- `Lesson.objectives` is `string | null` (plain text, not JSON array)
- Format example: `"Grammar: present tense -ar/-er/-ir. Communicative skills: reading,speaking. CEFR skill focus: EO,CO"`
- Populated by `CoursesController` when generating a lesson from a curriculum entry
- Already displayed in the metadata edit form as a textarea
- No read-only summary display exists

## Implementation

### 1. New Component: `LessonObjectivesSummary`
**File:** `frontend/src/components/lesson/LessonObjectivesSummary.tsx`

**Props:**
- `objectives: string | null` (the raw objectives string)
- `studentName: string | null` (for contextual summary sentence)

**Behavior:**
- Returns `null` when objectives is null/empty
- Parses objectives string by splitting on `. ` (period+space) to get individual items
- Each item renders as a colored pill/tag (following CompetencyBadge/VocabBadge pattern from CourseDetail)
- Color-coded by prefix: "Grammar:" = indigo, "Communicative skills:" = emerald, "CEFR skill focus:" = amber, other = zinc
- Summary sentence above pills: "Helps {studentName} practice {topic keywords}" or generic "Lesson objectives" when no student

### 2. Integration in LessonEditor
**File:** `frontend/src/pages/LessonEditor.tsx`

- Insert after the context bar (line ~616) and before the CEFR mismatch warning
- Only renders when `lesson.objectives` is truthy
- Pass `objectives={lesson.objectives}` and `studentName={lesson.studentName}`

### 3. Unit Tests
**File:** `frontend/src/components/lesson/LessonObjectivesSummary.test.tsx`

- Renders pills for each parsed objective
- Renders nothing when objectives is null
- Renders nothing when objectives is empty string
- Renders summary with student name when provided
- Renders generic summary when no student name
- Mobile responsive (flex-wrap)

## Design Details
- Container: rounded border card matching context bar style
- Pills: `rounded-full px-2 py-0.5 text-xs font-medium` (matching CompetencyBadge)
- Summary text: `text-sm text-zinc-600`
- Responsive: `flex flex-wrap gap-1.5` for pills

## Out of Scope
- Editing objectives from this component (edit form already exists)
- AI-generated summary sentence (client-side composition from objectives string)
- Changes to backend or API
