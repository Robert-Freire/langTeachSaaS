using ClosedXML.Excel;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.MigrationTool;

internal sealed class ImportResult
{
    public int SheetsProcessed { get; set; }
    public int SheetsMatched { get; set; }
    public int SheetsUnmatched { get; set; }
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
                Console.WriteLine($"WARNING: Sheet \"{sheetName}\" -> no matching student found");
                result.SheetsUnmatched++;
                continue;
            }

            Console.WriteLine($"Processing sheet: {sheetName} -> student: {student.Name}");
            result.SheetsMatched++;

            var profileNotes = CollectProfileNotes(worksheet);

            var sessionsImported = await ImportSessionsAsync(worksheet, student, result);
            result.SessionsImported += sessionsImported.imported;
            result.SessionsSkipped += sessionsImported.skipped;

            if (profileNotes.preply.Length > 0 || profileNotes.info.Length > 0)
            {
                await AppendStudentNotesAsync(student, profileNotes.preply, profileNotes.info);
                result.StudentsNotesUpdated++;
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
        Student student,
        ImportResult result)
    {
        int imported = 0;
        int skipped = 0;
        var now = DateTime.UtcNow;

        // Load existing dates for this student once to avoid per-row queries
        var existingDates = await _db.SessionLogs
            .Where(sl => sl.StudentId == student.Id)
            .Select(sl => sl.SessionDate)
            .ToHashSetAsync();

        foreach (var row in worksheet.RowsUsed())
        {
            // Skip header row (row 1)
            if (row.RowNumber() == 1) continue;

            var sessionDate = ExtractDate(row);
            if (sessionDate is null) continue;

            var planned = row.Cell(2).GetString().Trim();
            var actual = row.Cell(3).GetString().Trim();
            var homework = row.Cell(4).GetString().Trim();
            var notes = row.Cell(5).GetString().Trim();

            // Skip entirely empty rows
            if (planned.Length == 0 && actual.Length == 0 && homework.Length == 0 && notes.Length == 0)
                continue;

            // Idempotency: check in-memory set (populated from DB before loop)
            if (existingDates.Contains(sessionDate.Value))
            {
                Console.WriteLine($"  SKIP (duplicate): {sessionDate:yyyy-MM-dd}");
                skipped++;
                continue;
            }

            Console.WriteLine($"  + Session {sessionDate:yyyy-MM-dd}: planned={TruncateLog(planned)}, actual={TruncateLog(actual)}");

            if (!_dryRun)
            {
                _db.SessionLogs.Add(new SessionLog
                {
                    Id = Guid.NewGuid(),
                    StudentId = student.Id,
                    TeacherId = _teacherId,
                    SessionDate = sessionDate.Value,
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

                // Track in memory so re-encountered dates in the same sheet are also skipped
                existingDates.Add(sessionDate.Value);
            }

            imported++;
        }

        // Batch save all sessions for this sheet in one round-trip
        if (!_dryRun && imported > 0)
            await _db.SaveChangesAsync();

        return (imported, skipped);
    }

    private static DateTime? ExtractDate(IXLRow row)
    {
        // Try each cell in the row for a parseable date
        // The Excel layout has a date value — try the date cell heuristic:
        // check cell 1 first (some sheets put dates there), then scan all cells.
        for (int col = 1; col <= 7; col++)
        {
            var cell = row.Cell(col);
            if (TryParseDate(cell, out var date))
                return date;
        }
        return null;
    }

    private static bool TryParseDate(IXLCell cell, out DateTime result)
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

        // Text date
        if (cell.DataType == XLDataType.Text)
        {
            var text = cell.GetString().Trim();
            if (DateTime.TryParse(text, out var parsed))
            {
                result = parsed.Date;
                return true;
            }
        }

        return false;
    }

    private async Task AppendStudentNotesAsync(Student student, string preply, string info)
    {
        const string marker = "[Excel import";

        // Idempotency: do not append if already imported
        if (student.Notes?.Contains(marker) == true)
            return;

        var parts = new List<string>();
        if (preply.Length > 0) parts.Add($"Preply test: {preply}");
        if (info.Length > 0) parts.Add($"Student info: {info}");

        var appendBlock = $"\n[Excel import {DateTime.UtcNow:yyyy-MM-dd}]\n{string.Join("\n", parts)}";

        Console.WriteLine($"  Appending profile notes for {student.Name}");

        if (!_dryRun)
        {
            student.Notes = (student.Notes ?? string.Empty) + appendBlock;
            student.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    private static string? NullIfEmpty(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;

    private static string TruncateLog(string value) =>
        value.Length > 40 ? value[..40] + "..." : value;
}
