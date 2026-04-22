using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class StudentService : IStudentService
{
    private static readonly HashSet<string> AllowedNativeLanguages;

    static StudentService()
    {
        using var stream = Assembly.GetExecutingAssembly()
            .GetManifestResourceStream("LangTeach.Api.languages.json")!;
        var languages = JsonSerializer.Deserialize<string[]>(stream)!;
        AllowedNativeLanguages = new HashSet<string>(languages, StringComparer.Ordinal);
    }

    private static readonly HashSet<string> AllowedStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "Active", "Covered" };

    private static readonly HashSet<string> AllowedWeaknessTypes =
        new(StringComparer.OrdinalIgnoreCase) { "grammatical", "lexical", "orthographic" };

    private static readonly Dictionary<string, string> CanonicalSkillKeys =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Reading"] = "Reading", ["Writing"] = "Writing",
            ["Speaking"] = "Speaking", ["Listening"] = "Listening",
        };

    private static readonly Dictionary<string, string> CanonicalCefrLevels =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["A1"] = "A1", ["A2"] = "A2", ["B1"] = "B1",
            ["B2"] = "B2", ["C1"] = "C1", ["C2"] = "C2",
        };

    private readonly AppDbContext _db;
    private readonly ILogger<StudentService> _logger;
    private readonly IPedagogyConfigService _pedagogy;

    public StudentService(AppDbContext db, ILogger<StudentService> logger, IPedagogyConfigService pedagogy)
    {
        _db = db;
        _logger = logger;
        _pedagogy = pedagogy;
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

        var studentIds = items.Select(s => s.Id).ToList();
        var allTodos = await _db.TeacherFollowups
            .Where(f => f.StudentId != null && studentIds.Contains(f.StudentId.Value) && f.Kind == "pedagogical")
            .OrderBy(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
        var todosByStudent = allTodos
            .GroupBy(f => f.StudentId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        return new PagedResult<StudentDto>(
            items.Select(s => MapToDto(s, todosByStudent.GetValueOrDefault(s.Id, []))).ToList(),
            totalCount,
            page,
            pageSize
        );
    }

    public async Task<StudentDto?> GetByIdAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default)
    {
        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted, cancellationToken);

        if (student is null) return null;
        var todos = await FetchPedagogicalTodosAsync(studentId, cancellationToken);
        return MapToDto(student, todos);
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
        ValidateLearningGoals(request.LearningGoals);
        var normalizedSkillOverrides = NormalizeSkillLevelOverrides(request.SkillLevelOverrides);

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
            SkillLevelOverrides = JsonStorageHelper.Serialize(normalizedSkillOverrides),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Students.Add(student);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Student created. TeacherId={TeacherId} StudentId={StudentId}",
            teacherId, student.Id);

        return MapToDto(student, []);
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
        ValidateLearningGoals(request.LearningGoals);
        var normalizedSkillOverrides = NormalizeSkillLevelOverrides(request.SkillLevelOverrides);

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
        student.SkillLevelOverrides = JsonStorageHelper.Serialize(request.SkillLevelOverrides);
        student.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Student updated. TeacherId={TeacherId} StudentId={StudentId}",
            teacherId, student.Id);

        var todos = await FetchPedagogicalTodosAsync(studentId, cancellationToken);
        return MapToDto(student, todos);
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

    private static StudentDto MapToDto(Student s, List<TeacherFollowup> pedagogicalTodos) => new(
        s.Id,
        s.Name,
        s.LearningLanguage,
        s.CefrLevel,
        JsonStorageHelper.DeserializeList<string>(s.Interests),
        s.PersonalNotes,
        s.TeachingNotes,
        JsonStorageHelper.DeserializeList<string>(s.NativeLanguages),
        LearningGoalHelper.Deserialize(s.LearningGoals),
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
        JsonStorageHelper.DeserializeList<string>(s.SpokenLanguages),
        pedagogicalTodos.Select(ToTodo).ToList(),
        DeserializeSkillLevelOverrides(s.SkillLevelOverrides)
    );

    private static TeachingTodoDto ToTodo(TeacherFollowup f) => new(
        f.Id.ToString(),
        f.Text,
        f.CreatedAt,
        f.SourceSessionLogId?.ToString(),
        f.Status,
        f.CoveredInSessionLogId?.ToString());

    private async Task<List<TeacherFollowup>> FetchPedagogicalTodosAsync(Guid studentId, CancellationToken cancellationToken) =>
        await _db.TeacherFollowups
            .Where(f => f.StudentId == studentId && f.Kind == "pedagogical")
            .OrderBy(f => f.CreatedAt)
            .ToListAsync(cancellationToken);

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

    private void ValidateDifficulties(List<DifficultyDto> difficulties)
    {
        var validCompetencies = _pedagogy.GetValidDifficultyCompetencies();
        var validSeverities = _pedagogy.GetValidDifficultySeverities();
        foreach (var d in difficulties)
        {
            if (string.IsNullOrWhiteSpace(d.Id) || d.Id.Length > 100)
                throw new ValidationException("Each difficulty must have an id (max 100 characters).");
            if (string.IsNullOrWhiteSpace(d.Description) || d.Description.Length > 500)
                throw new ValidationException("Each difficulty description must be between 1 and 500 characters.");
            if (string.IsNullOrWhiteSpace(d.Competency) || !validCompetencies.Contains(d.Competency))
                throw new ValidationException($"Difficulty competency '{d.Competency}' is not valid. Allowed: {string.Join(", ", validCompetencies.OrderBy(x => x))}.");
            if (d.Subcategory is { Length: > 200 })
                throw new ValidationException("Difficulty subcategory must be at most 200 characters.");
            if (string.IsNullOrWhiteSpace(d.Severity) || !validSeverities.Contains(d.Severity))
                throw new ValidationException($"Difficulty severity '{d.Severity}' is not valid. Allowed: {string.Join(", ", validSeverities.OrderBy(x => x))}.");
            if (string.IsNullOrWhiteSpace(d.Status) || !AllowedStatuses.Contains(d.Status))
                throw new ValidationException($"Difficulty status '{d.Status}' is not valid. Allowed: {string.Join(", ", AllowedStatuses)}.");
            // Trend is system-computed; any submitted value is silently accepted and will be overwritten by DifficultyTrendService.
        }
    }

    private static void ValidateLearningGoals(List<LearningGoalDto> goals)
    {
        if (goals.Count > 20)
            throw new ValidationException("Cannot have more than 20 learning goals.");
        foreach (var goal in goals)
        {
            if (goal is null)
                throw new ValidationException("Learning goals list must not contain null entries.");
            if (string.IsNullOrWhiteSpace(goal.Id) || goal.Id.Length > 100)
                throw new ValidationException("Each learning goal must have an id (max 100 characters).");
            if (string.IsNullOrWhiteSpace(goal.Text) || goal.Text.Length > 200)
                throw new ValidationException("Each learning goal text must be between 1 and 200 characters.");
            var children = goal.Children ?? [];
            if (children.Count > 20)
                throw new ValidationException("Cannot have more than 20 sub-goals per goal.");
            foreach (var child in children)
            {
                if (child is null)
                    throw new ValidationException("Sub-goals list must not contain null entries.");
                if (string.IsNullOrWhiteSpace(child.Id) || child.Id.Length > 100)
                    throw new ValidationException("Each sub-goal must have an id (max 100 characters).");
                if (string.IsNullOrWhiteSpace(child.Text) || child.Text.Length > 200)
                    throw new ValidationException("Each sub-goal text must be between 1 and 200 characters.");
                var grandchildren = child.Children ?? [];
                if (grandchildren.Count > 0)
                    throw new ValidationException("Learning goals support at most 2 levels (no sub-sub-goals).");
            }
        }
    }

    // Trend is system-computed by DifficultyTrendService. Reset any client-supplied value to "stable"
    // so the server is always authoritative after the next session log confirm.
    private static List<DifficultyDto> NormalizeSystemFields(List<DifficultyDto> difficulties) =>
        difficulties.Select(d => d with { Trend = "stable" }).ToList();

    public async Task<StudentDto?> AppendTeachingTodoAsync(Guid teacherId, Guid studentId, CreateTeachingTodoDto request, CancellationToken cancellationToken = default)
    {
        var studentExists = await _db.Students
            .AnyAsync(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted, cancellationToken);

        if (!studentExists) return null;

        var sourceSessionLogId = await ResolveSessionLogIdAsync(teacherId, studentId, request.SourceSessionLogId, cancellationToken);
        var followup = new TeacherFollowup
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            StudentId = studentId,
            Text = request.Text,
            Status = "pending",
            Kind = "pedagogical",
            CreatedAt = DateTime.UtcNow,
            SourceSessionLogId = sourceSessionLogId,
        };
        _db.TeacherFollowups.Add(followup);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Teaching todo appended. TeacherId={TeacherId} StudentId={StudentId} FollowupId={FollowupId}",
            teacherId, studentId, followup.Id);

        return await GetByIdAsync(teacherId, studentId, cancellationToken);
    }

    public async Task<StudentDto?> UpdateTeachingTodoAsync(Guid teacherId, Guid studentId, string todoId, UpdateTeachingTodoDto request, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(todoId, out var todoGuid)) return null;

        var followup = await _db.TeacherFollowups
            .FirstOrDefaultAsync(f => f.Id == todoGuid
                                   && f.StudentId == studentId
                                   && f.TeacherId == teacherId
                                   && f.Kind == "pedagogical", cancellationToken);
        if (followup is null) return null;

        followup.Status = request.Status.ToLowerInvariant();
        if (request.Text is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Text) || request.Text.Length > 500)
                throw new ValidationException("Todo text must be between 1 and 500 characters.");
            followup.Text = request.Text;
        }
        if (request.CoveredInSessionLogId is not null)
            followup.CoveredInSessionLogId = await ResolveSessionLogIdAsync(teacherId, studentId, request.CoveredInSessionLogId, cancellationToken);
        followup.CompletedAt = followup.Status is "done" or "covered" ? DateTime.UtcNow : null;

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Teaching todo updated. TeacherId={TeacherId} StudentId={StudentId} FollowupId={FollowupId} Status={Status}",
            teacherId, studentId, todoGuid, followup.Status);

        return await GetByIdAsync(teacherId, studentId, cancellationToken);
    }

    public async Task<StudentDto?> DeleteTeachingTodoAsync(Guid teacherId, Guid studentId, string todoId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(todoId, out var todoGuid)) return null;

        var followup = await _db.TeacherFollowups
            .FirstOrDefaultAsync(f => f.Id == todoGuid
                                   && f.StudentId == studentId
                                   && f.TeacherId == teacherId
                                   && f.Kind == "pedagogical", cancellationToken);
        if (followup is null) return null;

        _db.TeacherFollowups.Remove(followup);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Teaching todo deleted. TeacherId={TeacherId} StudentId={StudentId} FollowupId={FollowupId}",
            teacherId, studentId, todoGuid);

        return await GetByIdAsync(teacherId, studentId, cancellationToken);
    }

    private async Task<Guid?> ResolveSessionLogIdAsync(
        Guid teacherId,
        Guid studentId,
        string? rawId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(rawId)) return null;
        if (!Guid.TryParse(rawId, out var id))
            throw new ValidationException("Session log id is not valid.");

        var exists = await _db.SessionLogs.AnyAsync(
            s => s.Id == id &&
                 s.TeacherId == teacherId &&
                 s.StudentId == studentId &&
                 !s.IsDeleted,
            cancellationToken);

        if (!exists)
            throw new ValidationException("Session log does not belong to this student.");

        return id;
    }

    private static Dictionary<string, string> NormalizeSkillLevelOverrides(Dictionary<string, string> overrides)
    {
        var normalized = new Dictionary<string, string>();
        foreach (var (key, value) in overrides)
        {
            if (!CanonicalSkillKeys.TryGetValue(key, out var canonicalKey))
                throw new ValidationException($"SkillLevelOverrides key '{key}' is not valid. Allowed: {string.Join(", ", CanonicalSkillKeys.Values)}.");
            if (!CanonicalCefrLevels.TryGetValue(value, out var canonicalValue))
                throw new ValidationException($"SkillLevelOverrides value '{value}' for key '{key}' is not a valid CEFR level. Allowed: A1, A2, B1, B2, C1, C2.");
            normalized[canonicalKey] = canonicalValue;
        }
        return normalized;
    }

    private static Dictionary<string, string> DeserializeSkillLevelOverrides(string? json)
    {
        if (string.IsNullOrEmpty(json)) return new();
        try
        {
            var raw = JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new();
            return NormalizeSkillLevelOverrides(raw);
        }
        catch (JsonException) { return new(); }
        catch (ValidationException) { return new(); }
    }

    private static string Serialize<T>(List<T> list) =>
        JsonStorageHelper.Serialize(list);
}
