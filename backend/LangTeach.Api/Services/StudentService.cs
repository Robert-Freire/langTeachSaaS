using System.ComponentModel.DataAnnotations;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class StudentService : IStudentService
{
    // Must stay in sync with NATIVE_LANGUAGES in frontend/src/lib/languages.ts.
    private static readonly HashSet<string> AllowedNativeLanguages =
    [
        "English", "Spanish", "French", "German", "Italian",
        "Portuguese", "Mandarin", "Japanese", "Arabic", "Catalan", "Other"
    ];

    private static readonly HashSet<string> AllowedCompetencies =
    [
        "Grammar", "Vocabulary", "Pronunciation", "Fluency", "Discourse"
    ];

    private static readonly HashSet<string> AllowedSeverityLevels =
    [
        "low", "medium", "high"
    ];

    private static readonly HashSet<string> AllowedStatuses =
    [
        "Active", "Covered"
    ];

    private static readonly HashSet<string> AllowedWeaknessTypes =
        new(StringComparer.OrdinalIgnoreCase) { "grammatical", "lexical", "orthographic" };

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
        ValidateNativeLanguages(request.NativeLanguages);
        var normalizedWeaknessesCreate = NormalizeWeaknesses(request.Weaknesses);
        ValidateWeaknesses(normalizedWeaknessesCreate);
        ValidateDifficulties(request.Difficulties);
        var normalizedDifficulties = NormalizeSystemFields(request.Difficulties);
        ValidateBirthYear(request.BirthYear);
        ValidateShortTermObjectives(request.ShortTermObjectives);

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            Name = request.Name,
            LearningLanguage = request.LearningLanguage,
            CefrLevel = request.CefrLevel,
            Interests = Serialize(request.Interests),
            NativeLanguages = Serialize(request.NativeLanguages),
            LearningGoals = Serialize(request.LearningGoals),
            Weaknesses = Serialize(normalizedWeaknessesCreate),
            Difficulties = Serialize(normalizedDifficulties),
            PersonalNotes = request.PersonalNotes,
            TeachingNotes = request.TeachingNotes,
            BirthYear = request.BirthYear,
            Profession = request.Profession,
            CountryOfOrigin = request.CountryOfOrigin,
            CityOfOrigin = request.CityOfOrigin,
            CountryOfResidence = request.CountryOfResidence,
            CityOfResidence = request.CityOfResidence,
            ReasonForStudying = request.ReasonForStudying,
            OfficialCefrLevel = request.OfficialCefrLevel,
            ShortTermObjectives = Serialize(request.ShortTermObjectives),
            IsActive = request.IsActive,
            IsCorporate = request.IsCorporate,
            Rate = request.Rate,
            SpokenLanguages = Serialize(request.SpokenLanguages),
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

        ValidateNativeLanguages(request.NativeLanguages);
        var normalizedWeaknessesUpdate = NormalizeWeaknesses(request.Weaknesses);
        ValidateWeaknesses(normalizedWeaknessesUpdate);
        ValidateDifficulties(request.Difficulties);
        var normalizedDifficulties = NormalizeSystemFields(request.Difficulties);
        ValidateBirthYear(request.BirthYear);
        ValidateShortTermObjectives(request.ShortTermObjectives);

        student.Name = request.Name;
        student.LearningLanguage = request.LearningLanguage;
        student.CefrLevel = request.CefrLevel;
        student.Interests = Serialize(request.Interests);
        student.NativeLanguages = Serialize(request.NativeLanguages);
        student.LearningGoals = Serialize(request.LearningGoals);
        student.Weaknesses = Serialize(normalizedWeaknessesUpdate);
        student.Difficulties = Serialize(normalizedDifficulties);
        student.PersonalNotes = request.PersonalNotes;
        student.TeachingNotes = request.TeachingNotes;
        student.BirthYear = request.BirthYear;
        student.Profession = request.Profession;
        student.CountryOfOrigin = request.CountryOfOrigin;
        student.CityOfOrigin = request.CityOfOrigin;
        student.CountryOfResidence = request.CountryOfResidence;
        student.CityOfResidence = request.CityOfResidence;
        student.ReasonForStudying = request.ReasonForStudying;
        student.OfficialCefrLevel = request.OfficialCefrLevel;
        student.ShortTermObjectives = Serialize(request.ShortTermObjectives);
        student.IsActive = request.IsActive;
        student.IsCorporate = request.IsCorporate;
        student.Rate = request.Rate;
        student.SpokenLanguages = Serialize(request.SpokenLanguages);
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
        JsonStorageHelper.DeserializeList<string>(s.Interests),
        s.PersonalNotes,
        s.TeachingNotes,
        JsonStorageHelper.DeserializeList<string>(s.NativeLanguages),
        JsonStorageHelper.DeserializeList<string>(s.LearningGoals),
        JsonStorageHelper.DeserializeListWithStringFallback<StudentWeaknessDto>(
            s.Weaknesses,
            str => new StudentWeaknessDto(str, "grammatical")),
        JsonStorageHelper.DeserializeList<DifficultyDto>(s.Difficulties),
        s.CreatedAt,
        s.UpdatedAt,
        s.BirthYear,
        s.Profession,
        s.CountryOfOrigin,
        s.CityOfOrigin,
        s.CountryOfResidence,
        s.CityOfResidence,
        s.ReasonForStudying,
        s.OfficialCefrLevel,
        JsonStorageHelper.DeserializeList<ShortTermObjectiveDto>(s.ShortTermObjectives),
        s.IsActive,
        s.IsCorporate,
        s.Rate,
        JsonStorageHelper.DeserializeList<string>(s.SpokenLanguages)
    );

    private static List<StudentWeaknessDto> NormalizeWeaknesses(List<StudentWeaknessDto> weaknesses) =>
        weaknesses.Select(w => w with { WeaknessType = (w.WeaknessType ?? string.Empty).ToLowerInvariant() }).ToList();

    private static void ValidateWeaknesses(List<StudentWeaknessDto> weaknesses)
    {
        foreach (var w in weaknesses)
        {
            if (string.IsNullOrWhiteSpace(w.Description) || w.Description.Length > 200)
                throw new ValidationException("Each weakness description must be between 1 and 200 characters.");
            if (string.IsNullOrWhiteSpace(w.WeaknessType) || !AllowedWeaknessTypes.Contains(w.WeaknessType))
                throw new ValidationException($"WeaknessType '{w.WeaknessType}' is not valid. Allowed: {string.Join(", ", AllowedWeaknessTypes)}.");
        }
    }

    private static void ValidateNativeLanguages(List<string> nativeLanguages)
    {
        if (nativeLanguages is null)
            throw new ValidationException("NativeLanguages is required.");

        foreach (var lang in nativeLanguages)
        {
            if (string.IsNullOrWhiteSpace(lang))
                throw new ValidationException("NativeLanguages cannot contain empty values.");

            if (!AllowedNativeLanguages.Contains(lang))
                throw new ValidationException($"NativeLanguage '{lang}' is not in the allowed list.");
        }
    }

    private static void ValidateBirthYear(int? birthYear)
    {
        if (birthYear is null) return;
        var currentYear = DateTime.UtcNow.Year;
        if (birthYear < 1920 || birthYear > currentYear)
            throw new ValidationException($"BirthYear must be between 1920 and {currentYear}.");
    }

    private static void ValidateShortTermObjectives(List<ShortTermObjectiveDto> objectives)
    {
        if (objectives.Count > 10)
            throw new ValidationException("ShortTermObjectives cannot contain more than 10 entries.");
        foreach (var o in objectives)
        {
            if (string.IsNullOrWhiteSpace(o.Id) || o.Id.Length > 50)
                throw new ValidationException("Each ShortTermObjective must have an Id (max 50 characters).");
            if (string.IsNullOrWhiteSpace(o.Text) || o.Text.Length > 200)
                throw new ValidationException("Each ShortTermObjective Text must be between 1 and 200 characters.");
        }
    }

    private static void ValidateDifficulties(List<DifficultyDto> difficulties)
    {
        foreach (var d in difficulties)
        {
            if (string.IsNullOrWhiteSpace(d.Id) || d.Id.Length > 100)
                throw new ValidationException("Each difficulty must have an id (max 100 characters).");
            if (string.IsNullOrWhiteSpace(d.Description) || d.Description.Length > 500)
                throw new ValidationException("Each difficulty description must be between 1 and 500 characters.");
            if (string.IsNullOrWhiteSpace(d.Competency) || !AllowedCompetencies.Contains(d.Competency))
                throw new ValidationException($"Difficulty competency '{d.Competency}' is not valid. Allowed: {string.Join(", ", AllowedCompetencies)}.");
            if (d.Subcategory is { Length: > 200 })
                throw new ValidationException("Difficulty subcategory must be at most 200 characters.");
            if (string.IsNullOrWhiteSpace(d.Severity) || !AllowedSeverityLevels.Contains(d.Severity))
                throw new ValidationException($"Difficulty severity '{d.Severity}' is not valid. Allowed: {string.Join(", ", AllowedSeverityLevels)}.");
            if (string.IsNullOrWhiteSpace(d.Status) || !AllowedStatuses.Contains(d.Status))
                throw new ValidationException($"Difficulty status '{d.Status}' is not valid. Allowed: {string.Join(", ", AllowedStatuses)}.");
            // Trend is system-computed; any submitted value is silently accepted and will be overwritten by DifficultyTrendService.
        }
    }

    // Trend is system-computed by DifficultyTrendService. Reset any client-supplied value to "stable"
    // so the server is always authoritative after the next session log confirm.
    private static List<DifficultyDto> NormalizeSystemFields(List<DifficultyDto> difficulties) =>
        difficulties.Select(d => d with { Trend = "stable" }).ToList();

    private static string Serialize<T>(List<T> list) =>
        JsonStorageHelper.Serialize(list);
}
