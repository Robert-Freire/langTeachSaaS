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

    private static CreateStudentRequest BaseRequest(List<string>? nativeLanguages = null) => new()
    {
        Name = "Test Student",
        LearningLanguage = "Spanish",
        CefrLevel = "B1",
        NativeLanguages = nativeLanguages ?? [],
    };

    [Fact]
    public async Task CreateAsync_CatalanNativeLanguage_Succeeds()
    {
        var result = await _sut.CreateAsync(_teacherId, BaseRequest(["Catalan"]));

        result.NativeLanguages.Should().BeEquivalentTo(["Catalan"]);
    }

    [Fact]
    public async Task CreateAsync_EmptyNativeLanguages_Succeeds()
    {
        var result = await _sut.CreateAsync(_teacherId, BaseRequest([]));

        result.NativeLanguages.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateAsync_UnknownNativeLanguage_ThrowsValidationException()
    {
        var act = () => _sut.CreateAsync(_teacherId, BaseRequest(["Klingon"]));

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
        var result = await _sut.CreateAsync(_teacherId, BaseRequest([language]));

        result.NativeLanguages.Should().BeEquivalentTo([language]);
    }
}
