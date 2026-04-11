# Task 669: Script to Copy Teacher Data from Azure SQL to Local Dev

## Goal
Python script that exports a teacher's complete dataset from Azure SQL and imports it into the local Docker SQL Server.

## Data Model (FK insertion order)

1. **Teachers** (root)
2. **TeacherSettings** (FK: TeacherId)
3. **Students** (FK: TeacherId)
4. **Lessons** (FK: TeacherId, StudentId) - no TemplateId copy (templates are seeded separately)
5. **LessonSections** (FK: LessonId)
6. **LessonContentBlocks** (FK: LessonId, LessonSectionId)
7. **LessonNotes** (FK: LessonId, StudentId, TeacherId)
8. **Materials** (FK: LessonSectionId) - metadata only, blob files stay in Azure
9. **Courses** (FK: TeacherId, StudentId)
10. **CurriculumEntries** (FK: CourseId, LessonId)
11. **CourseSuggestions** (FK: CourseId, CurriculumEntryId)
12. **SessionLogs** (FK: StudentId, TeacherId, LinkedLessonId)
13. **VoiceNotes** (FK: TeacherId) - metadata only
14. **VoiceNoteApplications** (FK: SessionLogId, VoiceNoteId)
15. **GenerationUsages** (FK: TeacherId)
16. **TelegramLinks** (FK: TeacherId) - skip (Telegram setup is env-specific)

## Connection Details

- **Azure SQL**: `langteach-sql-dev.database.windows.net` / `langteachdb`, auth via `az login` token
- **Local SQL**: `localhost,1434` / `LangTeach`, sa / from `.env` SA_PASSWORD

## Script Design

- Python 3 with `pyodbc`
- `--teacher-email` to identify teacher
- `--dry-run` to show counts only
- `--clean` flag to wipe existing data for that teacher before import
- Uses IDENTITY_INSERT ON for GUID PKs (not needed for SQL Server GUIDs, but needed for int PKs if any)
- Upsert via MERGE or delete-then-insert per teacher scope
- Prints summary table before executing

## Safety

- Azure connection is read-only (SELECT only)
- Local writes scoped to the teacher being copied
- No secrets in code (az token + .env SA_PASSWORD)

## Acceptance Criteria Mapping

- [x] az CLI auth for Azure SQL
- [x] Complete teacher dataset export
- [x] Import into local Docker SQL
- [x] Handle existing data (clean-replace)
- [x] --dry-run
- [x] Works from PowerShell on Windows
- [x] Inline help (argparse)
