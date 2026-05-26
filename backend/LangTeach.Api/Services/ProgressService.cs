using LangTeach.Api.Data;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class ProgressService : IProgressService
{
    private readonly AppDbContext _db;

    public ProgressService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<StudentProgressDto?> GetAsync(Guid teacherId, Guid studentId, CancellationToken ct = default)
    {
        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted, ct);

        if (student is null)
            return null;

        // Most recent active course for this student
        var course = await _db.Courses
            .Include(c => c.Entries.Where(e => !e.IsDeleted))
            .Where(c => c.StudentId == studentId && c.TeacherId == teacherId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(ct);

        // Session logs for pacing and timeline date lookup.
        // Groups #1326: include group sessions the student attended.
        var sessionLogs = await SessionLogQueries.ForStudentIncludingGroups(_db, teacherId, studentId)
            .Where(sl => !sl.IsCancelled && sl.SessionDate.HasValue)
            .ToListAsync(ct);

        var sessionsDone = sessionLogs.Count;

        // Build a lookup: lessonId -> earliest session date
        var lessonDateLookup = sessionLogs
            .Where(sl => sl.LinkedLessonId.HasValue)
            .GroupBy(sl => sl.LinkedLessonId!.Value)
            .ToDictionary(g => g.Key, g => g.Min(sl => sl.SessionDate));

        // Difficulty trends
        var difficulties = JsonStorageHelper.DeserializeList<DifficultyDto>(student.Difficulties)
            .Select(d => new DifficultyProgressDto(d.Id, d.Description, d.Competency, d.Subcategory, d.Severity, d.Status, d.Trend))
            .ToList();

        if (course is null)
        {
            return new StudentProgressDto(
                StudentName: student.Name,
                CourseName: null,
                CourseId: null,
                TotalEntries: 0,
                TaughtEntries: 0,
                CreatedEntries: 0,
                PlannedEntries: 0,
                PlannedSessionCount: null,
                SessionsDone: sessionsDone,
                ExamDate: null,
                PacingStatus: "unknown",
                DaysUntilExam: null,
                SessionsRemaining: null,
                Difficulties: difficulties,
                Timeline: []
            );
        }

        var entries = course.Entries.OrderBy(e => e.OrderIndex).ToList();

        var taughtEntries  = entries.Count(e => string.Equals(e.Status, "taught",   StringComparison.OrdinalIgnoreCase));
        var createdEntries = entries.Count(e => string.Equals(e.Status, "created",  StringComparison.OrdinalIgnoreCase));
        var plannedEntries = entries.Count(e => string.Equals(e.Status, "planned",  StringComparison.OrdinalIgnoreCase));

        // Pacing
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var pacingStatus = ComputePacingStatus(course.SessionCount, sessionsDone, course.ExamDate, course.CreatedAt, today);
        var daysUntilExam = course.ExamDate.HasValue ? (int?)(course.ExamDate.Value.DayNumber - today.DayNumber) : null;
        var sessionsRemaining = course.SessionCount > 0 ? (int?)Math.Max(0, course.SessionCount - sessionsDone) : null;

        // Timeline
        var timeline = entries.Select(e =>
        {
            DateTime? sessionDate = e.LessonId.HasValue && lessonDateLookup.TryGetValue(e.LessonId.Value, out var d) ? d : null;
            return new TimelineEntryDto(e.OrderIndex, e.Topic, e.GrammarFocus, e.Status, sessionDate);
        }).ToList();

        return new StudentProgressDto(
            StudentName: student.Name,
            CourseName: course.Name,
            CourseId: course.Id,
            TotalEntries: entries.Count,
            TaughtEntries: taughtEntries,
            CreatedEntries: createdEntries,
            PlannedEntries: plannedEntries,
            PlannedSessionCount: course.SessionCount > 0 ? course.SessionCount : null,
            SessionsDone: sessionsDone,
            ExamDate: course.ExamDate,
            PacingStatus: pacingStatus,
            DaysUntilExam: daysUntilExam,
            SessionsRemaining: sessionsRemaining,
            Difficulties: difficulties,
            Timeline: timeline
        );
    }

    private static string ComputePacingStatus(int sessionCount, int sessionsDone, DateOnly? examDate, DateTime createdAt, DateOnly today)
    {
        if (sessionCount <= 0)
            return "unknown";

        double expectedByNow;

        if (examDate.HasValue)
        {
            var courseStart = DateOnly.FromDateTime(createdAt);
            var daysTotal = Math.Max(1, examDate.Value.DayNumber - courseStart.DayNumber);
            var daysElapsed = Math.Clamp(today.DayNumber - courseStart.DayNumber, 0, daysTotal);
            expectedByNow = (double)daysElapsed / daysTotal * sessionCount;
        }
        else
        {
            var weeksElapsed = (DateTime.UtcNow - createdAt).TotalDays / 7.0;
            expectedByNow = Math.Min(weeksElapsed, sessionCount);
        }

        if (sessionsDone >= expectedByNow + 1.5) return "ahead";
        if (sessionsDone <= expectedByNow - 1.5) return "behind";
        return "on-track";
    }
}
