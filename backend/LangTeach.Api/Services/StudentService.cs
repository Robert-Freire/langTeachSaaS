using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class StudentService : IStudentService
{
    // Must stay in sync with the LANGUAGES constant in frontend/src/pages/StudentForm.tsx
    // and the NativeLanguage comment in CreateStudentRequest / UpdateStudentRequest.
    private static readonly HashSet<string> AllowedNativeLanguages =
    [
        "English", "Spanish", "French", "German", "Italian",
        "Portuguese", "Mandarin", "Japanese", "Arabic", "Other"
    ];

    private static readonly HashSet<string> AllowedDifficultyCategories =
    [
        "grammar", "vocabulary", "pronunciation", "writing", "comprehension"
    ];

    private static readonly HashSet<string> AllowedSeverityLevels =
    [
        "low", "medium", "high"
    ];

    private static readonly HashSet<string> AllowedTrends =
    [
        "improving", "stable", "declining"
    ];

    private readonly AppDbContext _db;
    private readonly ILogger<StudentService> _logger;

    public StudentService(AppDbContext db, ILogger<StudentService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<PagedResult<StudentDto>> ListAsync(Guid teacherId, StudentListQuery query, CancellationToken cancellationToken = default)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = query.PageSize;

        var q = _db.Students.Where(s => s.TeacherId == teacherId && !s.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Language))
            q = q.Where(s => s.LearningLanguage == query.Language);

        if (!string.IsNullOrWhiteSpace(query.CefrLevel))
            q = q.Where(s => s.CefrLevel == query.CefrLevel);

        var totalCount = await q.CountAsync(cancellationToken);

        var items = await q
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<StudentDto>(
            items.Select(MapToDto).ToList(),
            totalCount,
            page,
            pageSize
        );
    }

    public async Task<StudentDto?> GetByIdAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default)
    {
        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted, cancellationToken);

        return student is null ? null : MapToDto(student);
    }

    public async Task<StudentDto> CreateAsync(Guid teacherId, CreateStudentRequest request, CancellationToken cancellationToken = default)
    {
        ValidateNativeLanguage(request.NativeLanguage);
        ValidateDifficulties(request.Difficulties);

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            Name = request.Name,
            LearningLanguage = request.LearningLanguage,
            CefrLevel = request.CefrLevel,
            Interests = Serialize(request.Interests),
            NativeLanguage = request.NativeLanguage,
            LearningGoals = Serialize(request.LearningGoals),
            Weaknesses = Serialize(request.Weaknesses),
            Difficulties = Serialize(request.Difficulties),
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Students.Add(student);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Student created. TeacherId={TeacherId} StudentId={StudentId}",
            teacherId, student.Id);

        return MapToDto(student);
    }

    public async Task<StudentDto?> UpdateAsync(Guid teacherId, Guid studentId, UpdateStudentRequest request, CancellationToken cancellationToken = default)
    {
        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted, cancellationToken);

        if (student is null)
            return null;

        ValidateNativeLanguage(request.NativeLanguage);
        ValidateDifficulties(request.Difficulties);

        student.Name = request.Name;
        student.LearningLanguage = request.LearningLanguage;
        student.CefrLevel = request.CefrLevel;
        student.Interests = Serialize(request.Interests);
        student.NativeLanguage = request.NativeLanguage;
        student.LearningGoals = Serialize(request.LearningGoals);
        student.Weaknesses = Serialize(request.Weaknesses);
        student.Difficulties = Serialize(request.Difficulties);
        student.Notes = request.Notes;
        student.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Student updated. TeacherId={TeacherId} StudentId={StudentId}",
            teacherId, student.Id);

        return MapToDto(student);
    }

    public async Task<bool> DeleteAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default)
    {
        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted, cancellationToken);

        if (student is null)
            return false;

        student.IsDeleted = true;
        student.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Student deleted. TeacherId={TeacherId} StudentId={StudentId}",
            teacherId, student.Id);

        return true;
    }

    private static StudentDto MapToDto(Student s) => new(
        s.Id,
        s.Name,
        s.LearningLanguage,
        s.CefrLevel,
        Deserialize<string>(s.Interests),
        s.Notes,
        s.NativeLanguage,
        Deserialize<string>(s.LearningGoals),
        Deserialize<string>(s.Weaknesses),
        Deserialize<DifficultyDto>(s.Difficulties),
        s.CreatedAt,
        s.UpdatedAt
    );

    private static void ValidateNativeLanguage(string? nativeLanguage)
    {
        if (nativeLanguage is not null && !AllowedNativeLanguages.Contains(nativeLanguage))
            throw new ValidationException($"NativeLanguage '{nativeLanguage}' is not in the allowed list.");
    }

    private static void ValidateDifficulties(List<DifficultyDto> difficulties)
    {
        foreach (var d in difficulties)
        {
            if (string.IsNullOrWhiteSpace(d.Item) || d.Item.Length > 200)
                throw new ValidationException("Each difficulty item must be between 1 and 200 characters.");
            if (!AllowedDifficultyCategories.Contains(d.Category))
                throw new ValidationException($"Difficulty category '{d.Category}' is not valid. Allowed: {string.Join(", ", AllowedDifficultyCategories)}.");
            if (!AllowedSeverityLevels.Contains(d.Severity))
                throw new ValidationException($"Difficulty severity '{d.Severity}' is not valid. Allowed: {string.Join(", ", AllowedSeverityLevels)}.");
            if (!AllowedTrends.Contains(d.Trend))
                throw new ValidationException($"Difficulty trend '{d.Trend}' is not valid. Allowed: {string.Join(", ", AllowedTrends)}.");
        }
    }

    private static List<T> Deserialize<T>(string json)
    {
        try { return JsonSerializer.Deserialize<List<T>>(json) ?? []; }
        catch { return []; }
    }

    private static string Serialize<T>(List<T> list) =>
        JsonSerializer.Serialize(list);
}
