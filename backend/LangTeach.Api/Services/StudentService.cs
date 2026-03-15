using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class StudentService : IStudentService
{
    private static readonly HashSet<string> AllowedNativeLanguages =
    [
        "English", "Spanish", "French", "German", "Italian",
        "Portuguese", "Mandarin", "Japanese", "Arabic", "Other"
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

        student.Name = request.Name;
        student.LearningLanguage = request.LearningLanguage;
        student.CefrLevel = request.CefrLevel;
        student.Interests = Serialize(request.Interests);
        student.NativeLanguage = request.NativeLanguage;
        student.LearningGoals = Serialize(request.LearningGoals);
        student.Weaknesses = Serialize(request.Weaknesses);
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
        Deserialize(s.Interests),
        s.Notes,
        s.NativeLanguage,
        Deserialize(s.LearningGoals),
        Deserialize(s.Weaknesses),
        s.CreatedAt,
        s.UpdatedAt
    );

    private static void ValidateNativeLanguage(string? nativeLanguage)
    {
        if (nativeLanguage is not null && !AllowedNativeLanguages.Contains(nativeLanguage))
            throw new ValidationException($"NativeLanguage '{nativeLanguage}' is not in the allowed list.");
    }

    private static List<string> Deserialize(string json)
    {
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch { return []; }
    }

    private static string Serialize(List<string> list) =>
        JsonSerializer.Serialize(list);
}
