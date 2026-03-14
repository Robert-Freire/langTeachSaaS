using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class ProfileService : IProfileService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ProfileService> _logger;

    public ProfileService(AppDbContext db, ILogger<ProfileService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ProfileDto?> GetProfileAsync(string auth0UserId)
    {
        var teacher = await _db.Teachers
            .Include(t => t.Settings)
            .FirstOrDefaultAsync(t => t.Auth0UserId == auth0UserId);

        if (teacher is null)
            return null;

        return MapToDto(teacher);
    }

    public async Task<ProfileDto> UpdateProfileAsync(string auth0UserId, UpdateProfileRequest request)
    {
        var teacher = await _db.Teachers
            .Include(t => t.Settings)
            .FirstOrDefaultAsync(t => t.Auth0UserId == auth0UserId)
            ?? throw new InvalidOperationException($"Teacher not found for Auth0UserId={auth0UserId}");

        teacher.DisplayName = request.DisplayName;
        teacher.UpdatedAt = DateTime.UtcNow;

        if (teacher.Settings is null)
        {
            var newSettings = new TeacherSettings
            {
                Id = Guid.NewGuid(),
                TeacherId = teacher.Id,
                TeachingLanguages = Serialize(request.TeachingLanguages),
                CefrLevels = Serialize(request.CefrLevels),
                PreferredStyle = request.PreferredStyle,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.TeacherSettings.Add(newSettings);
            teacher.Settings = newSettings;
        }
        else
        {
            teacher.Settings.TeachingLanguages = Serialize(request.TeachingLanguages);
            teacher.Settings.CefrLevels = Serialize(request.CefrLevels);
            teacher.Settings.PreferredStyle = request.PreferredStyle;
            teacher.Settings.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return MapToDto(teacher);
    }

    public async Task UpsertTeacherAsync(string auth0UserId, string email)
    {
        var exists = await _db.Teachers.AnyAsync(t => t.Auth0UserId == auth0UserId);
        if (exists)
            return;

        var displayName = email.Contains('@') ? email[..email.IndexOf('@')] : email;
        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0UserId,
            Email = email,
            DisplayName = displayName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Teachers.Add(teacher);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Teacher upserted. TeacherId={TeacherId} Email={Email}", teacher.Id, email);
    }

    private static ProfileDto MapToDto(Teacher teacher) => new(
        teacher.Id,
        teacher.DisplayName,
        Deserialize(teacher.Settings?.TeachingLanguages ?? "[]"),
        Deserialize(teacher.Settings?.CefrLevels ?? "[]"),
        teacher.Settings?.PreferredStyle ?? "Conversational"
    );

    private static List<string> Deserialize(string json) =>
        JsonSerializer.Deserialize<List<string>>(json) ?? [];

    private static string Serialize(List<string> list) =>
        JsonSerializer.Serialize(list);
}
