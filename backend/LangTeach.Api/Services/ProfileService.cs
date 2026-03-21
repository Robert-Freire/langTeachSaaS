using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class ProfileService : IProfileService
{
    private readonly AppDbContext _db;
    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly IUsageLimitService _usageLimitService;
    private readonly ILogger<ProfileService> _logger;

    public ProfileService(AppDbContext db, IDbContextFactory<AppDbContext> dbFactory, IUsageLimitService usageLimitService, ILogger<ProfileService> logger)
    {
        _db = db;
        _dbFactory = dbFactory;
        _usageLimitService = usageLimitService;
        _logger = logger;
    }

    public async Task<ProfileDto?> GetProfileAsync(string auth0UserId)
    {
        var teacher = await _db.Teachers
            .Include(t => t.Settings)
            .FirstOrDefaultAsync(t => t.Auth0UserId == auth0UserId);

        if (teacher is null)
            return null;

        var hasStudents = await _db.Students.AnyAsync(s => s.TeacherId == teacher.Id && !s.IsDeleted);
        var hasLessons = await _db.Lessons.AnyAsync(l => l.TeacherId == teacher.Id && !l.IsDeleted);
        var usageStatus = await _usageLimitService.GetUsageStatusAsync(teacher.Id);

        return MapToDto(teacher, hasStudents, hasLessons, usageStatus);
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

        var hasStudents = await _db.Students.AnyAsync(s => s.TeacherId == teacher.Id && !s.IsDeleted);
        var hasLessons = await _db.Lessons.AnyAsync(l => l.TeacherId == teacher.Id && !l.IsDeleted);
        var usageStatus = await _usageLimitService.GetUsageStatusAsync(teacher.Id);

        return MapToDto(teacher, hasStudents, hasLessons, usageStatus);
    }

    public async Task CompleteOnboardingAsync(string auth0UserId)
    {
        var teacher = await _db.Teachers
            .FirstOrDefaultAsync(t => t.Auth0UserId == auth0UserId)
            ?? throw new InvalidOperationException($"Teacher not found for Auth0UserId={auth0UserId}");

        if (!teacher.HasCompletedOnboarding)
        {
            teacher.HasCompletedOnboarding = true;
            teacher.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<Guid> UpsertTeacherAsync(string auth0UserId, string email, string name = "")
    {
        if (string.IsNullOrWhiteSpace(auth0UserId))
            throw new ArgumentException("auth0UserId must be provided.", nameof(auth0UserId));

        // 1. Email-first lookup: find existing teacher by email (stable across providers)
        Teacher? existing = null;
        if (!string.IsNullOrEmpty(email))
        {
            existing = await _db.Teachers
                .Where(t => t.Email == email)
                .FirstOrDefaultAsync();
        }

        // 2. Fall back to Auth0UserId lookup (handles empty-email tokens)
        existing ??= await _db.Teachers
            .Where(t => t.Auth0UserId == auth0UserId)
            .FirstOrDefaultAsync();

        if (existing is not null)
        {
            var dirty = false;

            // Provider switch: same email, different Auth0UserId
            if (existing.Auth0UserId != auth0UserId)
            {
                var oldProvider = existing.Auth0UserId.Split('|', 2)[0];
                var newProvider = auth0UserId.Split('|', 2)[0];
                _logger.LogWarning(
                    "Provider switch detected for TeacherId={TeacherId}: {OldProvider} -> {NewProvider}",
                    existing.Id, oldProvider, newProvider);

                // Remove any stale teacher record that already holds the new Auth0UserId
                // (e.g., a phantom record with empty email created by seeding)
                var stale = await _db.Teachers
                    .Where(t => t.Auth0UserId == auth0UserId && t.Id != existing.Id)
                    .FirstOrDefaultAsync();
                if (stale is not null)
                {
                    var hasDependents =
                        await _db.Lessons.AnyAsync(l => l.TeacherId == stale.Id) ||
                        await _db.Students.AnyAsync(s => s.TeacherId == stale.Id) ||
                        await _db.TeacherSettings.AnyAsync(ts => ts.TeacherId == stale.Id);

                    if (hasDependents)
                        throw new InvalidOperationException(
                            $"Conflicting teacher {stale.Id} has dependents and requires manual merge.");

                    _logger.LogWarning(
                        "Removing stale teacher {StaleTeacherId} to resolve provider-switch conflict",
                        stale.Id);
                    _db.Teachers.Remove(stale);
                }

                existing.Auth0UserId = auth0UserId;
                dirty = true;
            }

            if (!string.IsNullOrEmpty(email) && string.IsNullOrEmpty(existing.Email))
            {
                existing.Email = email;
                dirty = true;
            }
            // Backfill display name if it still looks auto-generated (no spaces, all digits, or contains |)
            if (!string.IsNullOrEmpty(name) && LooksAutoGenerated(existing.DisplayName))
            {
                existing.DisplayName = name;
                dirty = true;
            }
            if (dirty)
            {
                existing.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                _logger.LogInformation("Updated profile for TeacherId={TeacherId}", existing.Id);
            }
            return existing.Id;
        }

        var displayName = !string.IsNullOrEmpty(name) ? name
            : email.Contains('@') ? email[..email.IndexOf('@')]
            : auth0UserId.Contains('|') ? auth0UserId[(auth0UserId.IndexOf('|') + 1)..]
            : auth0UserId;
        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0UserId,
            Email = email,
            DisplayName = displayName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        try
        {
            _db.Teachers.Add(teacher);
            await _db.SaveChangesAsync();
            _logger.LogInformation("Teacher upserted. TeacherId={TeacherId}", teacher.Id);
            return teacher.Id;
        }
        catch (DbUpdateException)
        {
            // After a failed SaveChangesAsync, the DbContext change tracker is
            // unreliable. Use a fresh context to query for the winning row.
            _db.Entry(teacher).State = EntityState.Detached;

            await using var freshDb = await _dbFactory.CreateDbContextAsync();

            // Try email-first in the race-condition handler too
            Teacher? winner = null;
            if (!string.IsNullOrEmpty(email))
            {
                winner = await freshDb.Teachers
                    .Where(t => t.Email == email)
                    .FirstOrDefaultAsync();
            }
            winner ??= await freshDb.Teachers
                .Where(t => t.Auth0UserId == auth0UserId)
                .FirstOrDefaultAsync();

            if (winner is not null)
                return winner.Id;

            throw; // not a duplicate-key race, propagate original exception
        }
    }

    public async Task<string> GetStoredEmailAsync(string auth0UserId)
    {
        var email = await _db.Teachers
            .Where(t => t.Auth0UserId == auth0UserId)
            .Select(t => t.Email)
            .FirstOrDefaultAsync();
        return email ?? "";
    }

    private static ProfileDto MapToDto(Teacher teacher, bool hasStudents, bool hasLessons, DTOs.UsageStatusDto usageStatus) => new(
        teacher.Id,
        teacher.DisplayName,
        Deserialize(teacher.Settings?.TeachingLanguages ?? "[]"),
        Deserialize(teacher.Settings?.CefrLevels ?? "[]"),
        teacher.Settings?.PreferredStyle ?? "Conversational",
        teacher.HasCompletedOnboarding,
        teacher.Settings is not null,
        hasStudents,
        hasLessons,
        usageStatus.UsedThisMonth,
        usageStatus.MonthlyLimit,
        usageStatus.Tier
    );

    private static List<string> Deserialize(string json) =>
        JsonSerializer.Deserialize<List<string>>(json) ?? [];

    private static string Serialize(List<string> list) =>
        JsonSerializer.Serialize(list);

    // Detects display names auto-generated from Auth0 IDs:
    // all-digit strings (Google sub), hex strings longer than 16 chars (auth0 sub without prefix), or contains |
    private static bool LooksAutoGenerated(string name) =>
        !string.IsNullOrEmpty(name) && !name.Contains(' ') &&
        (name.Contains('|') || name.All(char.IsDigit) ||
         (name.Length > 16 && name.All(c => c is >= '0' and <= '9' or >= 'a' and <= 'f' or >= 'A' and <= 'F')));
}
