using LangTeach.Api.Data;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class LessonNoteService : ILessonNoteService
{
    private readonly AppDbContext _db;
    private readonly ILogger<LessonNoteService> _logger;

    public LessonNoteService(AppDbContext db, ILogger<LessonNoteService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<LessonNotesDto?> GetByLessonIdAsync(Guid teacherId, Guid lessonId, CancellationToken cancellationToken = default)
    {
        var note = await _db.LessonNotes
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.LessonId == lessonId && n.TeacherId == teacherId, cancellationToken);

        if (note is null) return null;

        return new LessonNotesDto(
            note.Id,
            note.LessonId,
            note.WhatWasCovered,
            note.HomeworkAssigned,
            note.AreasToImprove,
            note.NextLessonIdeas,
            note.EmotionalSignals
        );
    }

    public async Task<LessonNotesDto> UpsertAsync(Guid teacherId, Guid lessonId, SaveLessonNotesRequest request, CancellationToken cancellationToken = default)
    {
        var lesson = await _db.Lessons
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.TeacherId == teacherId && !l.IsDeleted, cancellationToken);

        if (lesson is null)
            throw new KeyNotFoundException($"Lesson {lessonId} not found");

        if (lesson.StudentId is null)
            throw new InvalidOperationException("Cannot add notes to a lesson without a linked student");

        var note = await _db.LessonNotes
            .FirstOrDefaultAsync(n => n.LessonId == lessonId && n.TeacherId == teacherId, cancellationToken);

        var now = DateTime.UtcNow;

        if (note is null)
        {
            note = new Data.Models.LessonNote
            {
                Id = Guid.NewGuid(),
                LessonId = lessonId,
                StudentId = lesson.StudentId.Value,
                TeacherId = teacherId,
                WhatWasCovered = request.WhatWasCovered,
                HomeworkAssigned = request.HomeworkAssigned,
                AreasToImprove = request.AreasToImprove,
                NextLessonIdeas = request.NextLessonIdeas,
                EmotionalSignals = request.EmotionalSignals,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.LessonNotes.Add(note);
            _logger.LogInformation("Created LessonNote {NoteId} for Lesson {LessonId}", note.Id, lessonId);
        }
        else
        {
            note.WhatWasCovered = request.WhatWasCovered;
            note.HomeworkAssigned = request.HomeworkAssigned;
            note.AreasToImprove = request.AreasToImprove;
            note.NextLessonIdeas = request.NextLessonIdeas;
            note.EmotionalSignals = request.EmotionalSignals;
            note.UpdatedAt = now;
            _logger.LogInformation("Updated LessonNote {NoteId} for Lesson {LessonId}", note.Id, lessonId);
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new LessonNotesDto(
            note.Id,
            note.LessonId,
            note.WhatWasCovered,
            note.HomeworkAssigned,
            note.AreasToImprove,
            note.NextLessonIdeas,
            note.EmotionalSignals
        );
    }

    public async Task<List<LessonHistoryEntryDto>> GetLessonHistoryAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default)
    {
        var entries = await _db.Lessons
            .AsNoTracking()
            .Include(l => l.Template)
            .Where(l => l.TeacherId == teacherId && l.StudentId == studentId && !l.IsDeleted)
            .Join(
                _db.LessonNotes,
                l => l.Id,
                n => n.LessonId,
                (l, n) => new { Lesson = l, Note = n }
            )
            .Where(x =>
                !string.IsNullOrWhiteSpace(x.Note.WhatWasCovered) ||
                !string.IsNullOrWhiteSpace(x.Note.HomeworkAssigned) ||
                !string.IsNullOrWhiteSpace(x.Note.AreasToImprove) ||
                !string.IsNullOrWhiteSpace(x.Note.NextLessonIdeas) ||
                !string.IsNullOrWhiteSpace(x.Note.EmotionalSignals)
            )
            .OrderByDescending(x => x.Lesson.ScheduledAt ?? x.Lesson.CreatedAt)
            .Select(x => new LessonHistoryEntryDto(
                x.Lesson.Id,
                x.Lesson.Title,
                x.Lesson.Template != null ? x.Lesson.Template.Name : null,
                x.Lesson.ScheduledAt ?? x.Lesson.CreatedAt,
                x.Note.WhatWasCovered,
                x.Note.HomeworkAssigned,
                x.Note.AreasToImprove,
                x.Note.NextLessonIdeas,
                x.Note.EmotionalSignals
            ))
            .ToListAsync(cancellationToken);

        return entries;
    }
}
