using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class StudentServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly StudentService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();

    public StudentServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new StudentService(_db, NullLogger<StudentService>.Instance);

        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|student-test",
            Email = "student-test@test.com",
            DisplayName = "Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private static CreateStudentRequest BaseRequest(string? nativeLanguage = null) => new()
    {
        Name = "Test Student",
        LearningLanguage = "Spanish",
        CefrLevel = "B1",
        NativeLanguage = nativeLanguage,
    };

    [Fact]
    public async Task CreateAsync_CatalanNativeLanguage_Succeeds()
    {
        var result = await _sut.CreateAsync(_teacherId, BaseRequest("Catalan"));

        result.NativeLanguage.Should().Be("Catalan");
    }

    [Fact]
    public async Task CreateAsync_NullNativeLanguage_Succeeds()
    {
        var result = await _sut.CreateAsync(_teacherId, BaseRequest(null));

        result.NativeLanguage.Should().BeNull();
    }

    [Fact]
    public async Task CreateAsync_UnknownNativeLanguage_ThrowsValidationException()
    {
        var act = () => _sut.CreateAsync(_teacherId, BaseRequest("Klingon"));

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Theory]
    [InlineData("English")]
    [InlineData("Spanish")]
    [InlineData("French")]
    [InlineData("German")]
    [InlineData("Italian")]
    [InlineData("Portuguese")]
    [InlineData("Mandarin")]
    [InlineData("Japanese")]
    [InlineData("Arabic")]
    [InlineData("Catalan")]
    [InlineData("Other")]
    public async Task CreateAsync_AllNativeLanguages_AreAccepted(string language)
    {
        var result = await _sut.CreateAsync(_teacherId, BaseRequest(language));

        result.NativeLanguage.Should().Be(language);
    }

    [Fact]
    public async Task CreateAsync_ShortTermObjectives_RoundTrip()
    {
        var objectives = new List<ShortTermObjectiveDto>
        {
            new("o1", "Pass B2 exam", new DateOnly(2026, 6, 30)),
            new("o2", "Read a novel in Spanish", null),
        };
        var request = BaseRequest();
        request.ShortTermObjectives = objectives;

        var result = await _sut.CreateAsync(_teacherId, request);

        result.ShortTermObjectives.Should().HaveCount(2);
        result.ShortTermObjectives[0].Id.Should().Be("o1");
        result.ShortTermObjectives[0].Text.Should().Be("Pass B2 exam");
        result.ShortTermObjectives[0].TargetDate.Should().Be(new DateOnly(2026, 6, 30));
        result.ShortTermObjectives[1].Id.Should().Be("o2");
        result.ShortTermObjectives[1].TargetDate.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_ClearsShortTermObjectives()
    {
        var createRequest = BaseRequest();
        createRequest.ShortTermObjectives = [new("o1", "Initial objective", null)];
        var created = await _sut.CreateAsync(_teacherId, createRequest);

        var updateRequest = new UpdateStudentRequest
        {
            Name = created.Name,
            LearningLanguage = created.LearningLanguage,
            CefrLevel = created.CefrLevel,
            ShortTermObjectives = [],
        };
        var updated = await _sut.UpdateAsync(_teacherId, created.Id, updateRequest);

        updated!.ShortTermObjectives.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateAsync_SpokenLanguages_RoundTrip()
    {
        var request = BaseRequest();
        request.SpokenLanguages = ["French", "Italian"];

        var result = await _sut.CreateAsync(_teacherId, request);

        result.SpokenLanguages.Should().BeEquivalentTo(["French", "Italian"]);
    }

    [Fact]
    public async Task CreateAsync_BirthYearOutOfRange_ThrowsValidationException()
    {
        var request = BaseRequest();
        request.BirthYear = 1900;

        var act = () => _sut.CreateAsync(_teacherId, request);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_BirthYearFuture_ThrowsValidationException()
    {
        var request = BaseRequest();
        request.BirthYear = DateTime.UtcNow.Year + 1;

        var act = () => _sut.CreateAsync(_teacherId, request);

        await act.Should().ThrowAsync<ValidationException>();
    }
}
