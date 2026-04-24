# Sessions Screen Behavior

## Screen: /sessions

### Row navigation
- Clicking a session row (anywhere including the chevron) navigates to the LogSession page in edit mode: `/students/:studentId/sessions/:sessionLogId/edit`
- There is no inline modal or dialog. The teacher lands on the full two-panel LogSession page.
- After editing, the teacher clicks "Done" to return to the student detail page (sessions tab).

### Student filter
- Default: all students shown
- Selecting a student in the dropdown filters rows to that student only
- Selecting "All students" restores the full list

### Sections
- Upcoming: future sessions, grouped by date
- Today: sessions for today
- Recent: past sessions, grouped by date
- Empty state: shown when all three sections are empty (icon + message)

### Design notes
- Row layout: time | student name | CEFR badge | planned content (desktop) | status chip | chevron
- Chevron is decorative; the entire row is the click target
- Status chip colors: see sessionStatusUtils for mapping
