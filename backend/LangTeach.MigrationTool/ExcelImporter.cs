using System.Globalization;
using ClosedXML.Excel;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.MigrationTool;

internal sealed class ImportResult
{
    public int SheetsProcessed { get; set; }
    public int SheetsMatched { get; set; }
    public int StudentsCreated { get; set; }
    public int SessionsImported { get; set; }
    public int SessionsSkipped { get; set; }
    public int StudentsNotesUpdated { get; set; }
}

internal sealed class ExcelImporter
{
    private readonly AppDbContext _db;
    private readonly Guid _teacherId;
    private readonly bool _dryRun;

    public ExcelImporter(AppDbContext db, Guid teacherId, bool dryRun)
    {
        _db = db;
        _teacherId = teacherId;
        _dryRun = dryRun;
    }

    public async Task<ImportResult> ImportAsync(string filePath)
    {
        var result = new ImportResult();

        var students = await _db.Students
            .Where(s => s.TeacherId == _teacherId && !s.IsDeleted)
            .ToListAsync();

        using var workbook = new XLWorkbook(filePath);

        foreach (var worksheet in workbook.Worksheets)
        {
            result.SheetsProcessed++;
            var sheetName = worksheet.Name;

            var student = StudentMatcher.FindStudent(sheetName, students);
            if (student is null)
            {
                student = await CreateStudentAsync(sheetName, worksheet);
                students = [..students, student]; // keep in-memory list up to date
                result.StudentsCreated++;
            }

            Console.WriteLine($"Processing sheet: {sheetName} -> student: {student.Name}");
            result.SheetsMatched++;

            var profileNotes = CollectProfileNotes(worksheet);

            var sessionsImported = await ImportSessionsAsync(worksheet, student);
            result.SessionsImported += sessionsImported.imported;
            result.SessionsSkipped += sessionsImported.skipped;

            if (profileNotes.preply.Length > 0 || profileNotes.info.Length > 0)
            {
                var updated = await AppendStudentNotesAsync(student, profileNotes.preply, profileNotes.info);
                if (updated) result.StudentsNotesUpdated++;
            }
        }

        return result;
    }

    private static (string preply, string info) CollectProfileNotes(IXLWorksheet worksheet)
    {
        var preplyParts = new List<string>();
        var infoParts = new List<string>();

        foreach (var row in worksheet.RowsUsed())
        {
            if (row.RowNumber() == 1) continue; // skip header row
            var colF = row.Cell(6).GetString().Trim();
            var colG = row.Cell(7).GetString().Trim();
            if (colF.Length > 0) preplyParts.Add(colF);
            if (colG.Length > 0) infoParts.Add(colG);
        }

        return (
            string.Join("; ", preplyParts.Distinct()),
            string.Join("; ", infoParts.Distinct())
        );
    }

    private async Task<(int imported, int skipped)> ImportSessionsAsync(
        IXLWorksheet worksheet,
        Student student)
    {
        int imported = 0;
        int skipped = 0;
        var now = DateTime.UtcNow;

        // Load existing non-deleted dates for this student once to avoid per-row queries.
        // Normalize to .Date so API-created entries with non-midnight times still match.
        var existingDates = (await _db.SessionLogs
            .Where(sl => sl.StudentId == student.Id && !sl.IsDeleted)
            .Select(sl => sl.SessionDate)
            .ToListAsync())
            .Select(d => d.Date)
            .ToHashSet();

        foreach (var row in worksheet.RowsUsed())
        {
            if (row.RowNumber() == 1) continue; // skip header row

            var sessionDate = ExtractDate(row);
            if (sessionDate is null) continue;

            if (sessionDate.Value.Date > now.Date)
            {
                Console.WriteLine($"  SKIP (future date): {sessionDate.Value.Date:yyyy-MM-dd}");
                skipped++;
                continue;
            }

            var planned = row.Cell(2).GetString().Trim();
            var actual = row.Cell(3).GetString().Trim();
            var homework = row.Cell(4).GetString().Trim();
            var notes = row.Cell(5).GetString().Trim();

            // Skip entirely empty rows
            if (planned.Length == 0 && actual.Length == 0 && homework.Length == 0 && notes.Length == 0)
                continue;

            var sessionDay = sessionDate.Value.Date;

            // Idempotency: check in-memory set (populated from DB before loop)
            if (existingDates.Contains(sessionDay))
            {
                Console.WriteLine($"  SKIP (duplicate): {sessionDay:yyyy-MM-dd}");
                skipped++;
                continue;
            }

            // Track in memory immediately so repeated dates in same sheet are also skipped
            // (applies in both live and dry-run mode)
            existingDates.Add(sessionDay);

            Console.WriteLine($"  + Session {sessionDay:yyyy-MM-dd}: planned={TruncateLog(planned)}, actual={TruncateLog(actual)}");

            if (!_dryRun)
            {
                _db.SessionLogs.Add(new SessionLog
                {
                    Id = Guid.NewGuid(),
                    StudentId = student.Id,
                    TeacherId = _teacherId,
                    SessionDate = sessionDay,
                    PlannedContent = NullIfEmpty(planned),
                    ActualContent = NullIfEmpty(actual),
                    HomeworkAssigned = NullIfEmpty(homework),
                    GeneralNotes = NullIfEmpty(notes),
                    PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                    IsDeleted = false,
                    TopicTags = "[]",
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }

            imported++;
        }

        // Batch save all sessions for this sheet in one round-trip
        if (!_dryRun && imported > 0)
            await _db.SaveChangesAsync();

        return (imported, skipped);
    }

    private static readonly string[] DateFormats =
        ["yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "d/M/yyyy", "M/d/yyyy", "dd-MM-yyyy", "MM-dd-yyyy"];

    private static DateTime? ExtractDate(IXLRow row)
    {
        // Date is expected in column A only; scanning content columns causes false positives.
        TryParseDate(row.Cell(1), out var date);
        return date == default ? null : date;
    }

    internal static bool TryParseDate(IXLCell cell, out DateTime result)
    {
        result = default;

        // ClosedXML typed value
        if (cell.DataType == XLDataType.DateTime)
        {
            result = cell.GetDateTime().Date;
            return true;
        }

        // Numeric OA date serial (1 = 1900-01-01, 50000 = ~2036-11-21)
        if (cell.DataType == XLDataType.Number)
        {
            var num = cell.GetDouble();
            if (num is >= 1 and <= 50000)
            {
                try
                {
                    result = DateTime.FromOADate(num).Date;
                    return true;
                }
                catch { }
            }
        }

        // Text date — explicit formats with InvariantCulture to avoid locale differences
        if (cell.DataType == XLDataType.Text)
        {
            var text = cell.GetString().Trim();
            if (DateTime.TryParseExact(text, DateFormats, CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var parsed))
            {
                result = parsed.Date;
                return true;
            }
        }

        return false;
    }

    private async Task<bool> AppendStudentNotesAsync(Student student, string preply, string info)
    {
        // Idempotency: do not append if already imported
        if (student.Notes?.Contains("Preply test:") == true || student.Notes?.Contains("Student info:") == true)
            return false;

        var parts = new List<string>();
        if (preply.Length > 0)
        {
            var level = StudentMatcher.ParseLevelFromText(preply);
            parts.Add(level is not null ? $"Preply test: {level}" : preply);
        }
        if (info.Length > 0) parts.Add($"Student info: {info}");

        if (parts.Count == 0) return false;

        var appendBlock = $"\n{string.Join("\n", parts)}";

        Console.WriteLine($"  Appending profile notes for {student.Name}");

        if (!_dryRun)
        {
            student.Notes = (student.Notes ?? string.Empty) + appendBlock;
            student.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        return false;
    }

    internal static string? ExtractLevelFromColumnF(IXLWorksheet worksheet)
    {
        foreach (var row in worksheet.RowsUsed())
        {
            if (row.RowNumber() == 1) continue; // skip header row
            var colF = row.Cell(6).GetString().Trim();
            var level = StudentMatcher.ParseLevelFromText(colF);
            if (level is not null) return level;
        }
        return null;
    }

    private async Task<Student> CreateStudentAsync(string sheetName, IXLWorksheet worksheet)
    {
        var (name, rawLevel) = StudentMatcher.ParseSheetName(sheetName);
        var level = StudentMatcher.NormalizeLevel(rawLevel) ?? ExtractLevelFromColumnF(worksheet);
        var now = DateTime.UtcNow;

        Console.WriteLine($"  CREATE student: \"{name}\" (level: {level ?? "A1 (default)"}) from sheet \"{sheetName}\"");

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = _teacherId,
            Name = name,
            LearningLanguage = "Spanish",
            CefrLevel = level ?? "A1", // level already normalized; A1 is fallback for unknown
            Interests = "[]",
            LearningGoals = "[]",
            Weaknesses = "[]",
            Difficulties = "[]",
            SkillLevelOverrides = "{}",
            IsDeleted = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        if (!_dryRun)
        {
            _db.Students.Add(student);
            await _db.SaveChangesAsync();
        }

        return student;
    }

    private static string? NullIfEmpty(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;

    private static string TruncateLog(string value) =>
        value.Length > 40 ? value[..40] + "..." : value;
}
