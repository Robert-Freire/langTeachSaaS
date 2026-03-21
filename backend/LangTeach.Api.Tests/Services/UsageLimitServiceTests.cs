using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Services;

public class UsageLimitServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _proTeacherId = Guid.NewGuid();

    public UsageLimitServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        SeedData();
    }

    private void SeedData()
    {
        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|free-user",
            Email = "free@test.com",
            DisplayName = "Free User",
            SubscriptionTier = SubscriptionTier.Free,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Teachers.Add(new Teacher
        {
            Id = _proTeacherId,
            Auth0UserId = "auth0|pro-user",
            Email = "pro@test.com",
            DisplayName = "Pro User",
            SubscriptionTier = SubscriptionTier.Pro,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    private UsageLimitService CreateService(int freeLimit = 5, int proLimit = -1) =>
        new(_db, Options.Create(new GenerationLimitsOptions
        {
            FreeTierMonthlyLimit = freeLimit,
            ProTierMonthlyLimit = proLimit,
        }), NullLogger<UsageLimitService>.Instance);

    [Fact]
    public async Task CanGenerateAsync_UnderLimit_ReturnsTrue()
    {
        var sut = CreateService(freeLimit: 5);

        var result = await sut.CanGenerateAsync(_teacherId);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanGenerateAsync_AtLimit_ReturnsFalse()
    {
        var sut = CreateService(freeLimit: 2);
        await sut.RecordGenerationAsync(_teacherId, ContentBlockType.Vocabulary);
        await sut.RecordGenerationAsync(_teacherId, ContentBlockType.Grammar);

        var result = await sut.CanGenerateAsync(_teacherId);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanGenerateAsync_ProTier_AlwaysReturnsTrue()
    {
        var sut = CreateService(freeLimit: 1, proLimit: -1);
        // Record more than the free limit for the Pro user
        await sut.RecordGenerationAsync(_proTeacherId, ContentBlockType.Vocabulary);
        await sut.RecordGenerationAsync(_proTeacherId, ContentBlockType.Grammar);

        var result = await sut.CanGenerateAsync(_proTeacherId);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task RecordGenerationAsync_InsertsRow()
    {
        var sut = CreateService();

        await sut.RecordGenerationAsync(_teacherId, ContentBlockType.Exercises);

        var count = await _db.GenerationUsages.CountAsync(g => g.TeacherId == _teacherId);
        count.Should().Be(1);
    }

    [Fact]
    public async Task GetUsageStatusAsync_ReturnsCorrectCount()
    {
        var sut = CreateService(freeLimit: 10);
        await sut.RecordGenerationAsync(_teacherId, ContentBlockType.Vocabulary);
        await sut.RecordGenerationAsync(_teacherId, ContentBlockType.Grammar);
        await sut.RecordGenerationAsync(_teacherId, ContentBlockType.Exercises);

        var status = await sut.GetUsageStatusAsync(_teacherId);

        status.UsedThisMonth.Should().Be(3);
        status.MonthlyLimit.Should().Be(10);
        status.Tier.Should().Be("Free");
    }

    [Fact]
    public async Task GetUsageStatusAsync_DoesNotCountPreviousMonth()
    {
        var sut = CreateService(freeLimit: 10);

        // Add a usage record from last month
        _db.GenerationUsages.Add(new GenerationUsage
        {
            Id = Guid.NewGuid(),
            TeacherId = _teacherId,
            BlockType = ContentBlockType.Vocabulary,
            CreatedAt = DateTime.UtcNow.AddMonths(-1),
        });
        await _db.SaveChangesAsync();

        // Add one for this month
        await sut.RecordGenerationAsync(_teacherId, ContentBlockType.Grammar);

        var status = await sut.GetUsageStatusAsync(_teacherId);

        status.UsedThisMonth.Should().Be(1);
    }

    [Fact]
    public async Task GetUsageStatusAsync_ResetsAtIsFirstOfNextMonth()
    {
        var sut = CreateService();

        var status = await sut.GetUsageStatusAsync(_teacherId);

        var expectedReset = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);
        status.ResetsAt.Should().Be(expectedReset);
    }

    [Fact]
    public async Task CanGenerateAsync_PreviousMonthUsageDoesNotCount()
    {
        var sut = CreateService(freeLimit: 1);

        // Record from previous month
        _db.GenerationUsages.Add(new GenerationUsage
        {
            Id = Guid.NewGuid(),
            TeacherId = _teacherId,
            BlockType = ContentBlockType.Vocabulary,
            CreatedAt = DateTime.UtcNow.AddMonths(-1),
        });
        await _db.SaveChangesAsync();

        var result = await sut.CanGenerateAsync(_teacherId);

        result.Should().BeTrue();
    }

    public void Dispose() => _db.Dispose();
}
