using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

internal sealed class FakeCurriculumGenerationService : ICurriculumGenerationService
{
    public List<CurriculumEntry> EntriesToReturn { get; set; } =
    [
        new CurriculumEntry { Id = Guid.NewGuid(), Topic = "Entry 1", Competencies = "", Status = "planned", OrderIndex = 1 },
    ];

    public List<CurriculumWarning> WarningsToReturn { get; set; } = [];

    public Task<(List<CurriculumEntry> Entries, List<CurriculumWarning> Warnings)> GenerateAsync(CurriculumContext ctx, CancellationToken ct = default)
        => Task.FromResult((EntriesToReturn, WarningsToReturn));
}

internal sealed class FakeCurriculumTemplateService : ICurriculumTemplateService
{
    public CurriculumTemplateData? DataToReturn { get; set; }

    public CurriculumTemplateData? GetByLevel(string level) => DataToReturn;
    public IReadOnlyList<CurriculumTemplateSummary> GetAll() => [];
    public IReadOnlyList<string> GetGrammarForCefrPrefix(string cefrPrefix) => [];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

public class CourseServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly FakeCurriculumGenerationService _curriculumService;
    private readonly FakeCurriculumTemplateService _templateService;
    private readonly CourseService _sut;

    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _otherTeacherId = Guid.NewGuid();

    public CourseServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _curriculumService = new FakeCurriculumGenerationService();
        _templateService = new FakeCurriculumTemplateService();
        _sut = new CourseService(_db, _curriculumService, _templateService, NullLogger<CourseService>.Instance);

        SeedData();
    }

    private void SeedData()
    {
        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|course-test",
            Email = "course@test.com",
            DisplayName = "Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        _db.Teachers.Add(new Teacher
        {
            Id = _otherTeacherId,
            Auth0UserId = "auth0|other",
            Email = "other@test.com",
            DisplayName = "Other Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        var course = new Course
        {
            Id = Guid.NewGuid(),
            TeacherId = _teacherId,
            Name = "Existing Course",
            Language = "Spanish",
            Mode = "general",
            TargetCefrLevel = "B1",
            SessionCount = 10,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Entries = [],
        };
        _db.Courses.Add(course);
        _db.SaveChanges();
        _existingCourseId = course.Id;
    }

    private Guid _existingCourseId;

    public void Dispose() => _db.Dispose();

    // --- ListAsync ---

    [Fact]
    public async Task ListAsync_ReturnsOnlyTeacherNonDeletedCourses()
    {
        var otherCourse = new Course
        {
            Id = Guid.NewGuid(),
            TeacherId = _otherTeacherId,
            Name = "Other Course",
            Language = "French",
            Mode = "general",
            SessionCount = 5,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Entries = [],
        };
        var deletedCourse = new Course
        {
            Id = Guid.NewGuid(),
            TeacherId = _teacherId,
            Name = "Deleted",
            Language = "Spanish",
            Mode = "general",
            SessionCount = 5,
            IsDeleted = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Entries = [],
        };
        _db.Courses.AddRange(otherCourse, deletedCourse);
        await _db.SaveChangesAsync();

        var result = await _sut.ListAsync(_teacherId);

        result.Should().HaveCount(1);
        result[0].Name.Should().Be("Existing Course");
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetByIdAsync_ReturnsCourse_WhenOwned()
    {
        var result = await _sut.GetByIdAsync(_teacherId, _existingCourseId);
        result.Should().NotBeNull();
        result!.Name.Should().Be("Existing Course");
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenOtherTeacher()
    {
        var result = await _sut.GetByIdAsync(_otherTeacherId, _existingCourseId);
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_DeserializesWarnings_WhenPresent()
    {
        var warnings = new List<CurriculumWarning> { new(1, "Preterite", "above level", "A2") };
        var course = await _db.Courses.FindAsync(_existingCourseId);
        course!.GenerationWarnings = JsonSerializer.Serialize(warnings);
        await _db.SaveChangesAsync();

        var result = await _sut.GetByIdAsync(_teacherId, _existingCourseId);

        result!.Warnings.Should().HaveCount(1);
        result.Warnings![0].GrammarFocus.Should().Be("Preterite");
    }

    // --- CreateAsync ---

    [Fact]
    public async Task CreateAsync_CreatesCoursAndEntries_WithValidRequest()
    {
        var request = new CreateCourseRequest
        {
            Name = "New Course",
            Language = "Spanish",
            Mode = "general",
            TargetCefrLevel = "A2",
            SessionCount = 8,
        };

        var (dto, warnings) = await _sut.CreateAsync(_teacherId, request);

        dto.Name.Should().Be("New Course");
        dto.Entries.Should().HaveCount(1);
        warnings.Should().BeEmpty();

        _db.Courses.Count(c => c.TeacherId == _teacherId && !c.IsDeleted).Should().Be(2);
    }

    [Fact]
    public async Task CreateAsync_ThrowsValidation_WhenExamPrepMissingTargetExam()
    {
        var request = new CreateCourseRequest
        {
            Name = "Exam Course",
            Language = "Spanish",
            Mode = "exam-prep",
            SessionCount = 10,
        };

        await _sut.Invoking(s => s.CreateAsync(_teacherId, request))
            .Should().ThrowAsync<ValidationException>()
            .WithMessage("*TargetExam*");
    }

    [Fact]
    public async Task CreateAsync_ThrowsValidation_WhenStudentNotFound()
    {
        var request = new CreateCourseRequest
        {
            Name = "Course",
            Language = "Spanish",
            Mode = "general",
            TargetCefrLevel = "B1",
            SessionCount = 10,
            StudentId = Guid.NewGuid(),
        };

        await _sut.Invoking(s => s.CreateAsync(_teacherId, request))
            .Should().ThrowAsync<ValidationException>()
            .WithMessage("*StudentId*");
    }

    [Fact]
    public async Task CreateAsync_ThrowsValidation_WhenTemplateNotFound()
    {
        _templateService.DataToReturn = null;

        var request = new CreateCourseRequest
        {
            Name = "Course",
            Language = "Spanish",
            Mode = "general",
            TemplateLevel = "A1.1",
            SessionCount = 10,
        };

        await _sut.Invoking(s => s.CreateAsync(_teacherId, request))
            .Should().ThrowAsync<ValidationException>()
            .WithMessage("*Template*not found*");
    }

    // --- UpdateAsync ---

    [Fact]
    public async Task UpdateAsync_UpdatesFields_WhenFound()
    {
        var request = new UpdateCourseRequest { Name = "Updated Name" };
        var found = await _sut.UpdateAsync(_teacherId, _existingCourseId, request);

        found.Should().BeTrue();
        var course = await _db.Courses.FindAsync(_existingCourseId);
        course!.Name.Should().Be("Updated Name");
    }

    [Fact]
    public async Task UpdateAsync_ReturnsFalse_WhenNotFound()
    {
        var request = new UpdateCourseRequest { Name = "X" };
        var found = await _sut.UpdateAsync(_teacherId, Guid.NewGuid(), request);
        found.Should().BeFalse();
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task DeleteAsync_SoftDeletes_WhenFound()
    {
        var found = await _sut.DeleteAsync(_teacherId, _existingCourseId);

        found.Should().BeTrue();
        var course = await _db.Courses.FindAsync(_existingCourseId);
        course!.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteAsync_ReturnsFalse_WhenNotFound()
    {
        var found = await _sut.DeleteAsync(_teacherId, Guid.NewGuid());
        found.Should().BeFalse();
    }

    // --- AddEntryAsync ---

    [Fact]
    public async Task AddEntryAsync_AddsEntryWithCorrectOrderIndex()
    {
        var request = new AddCurriculumEntryRequest("New Topic", null, null, null);
        var (courseFound, entry) = await _sut.AddEntryAsync(_teacherId, _existingCourseId, request);

        courseFound.Should().BeTrue();
        entry.Should().NotBeNull();
        entry!.Topic.Should().Be("New Topic");
        entry.OrderIndex.Should().Be(1);
    }

    [Fact]
    public async Task AddEntryAsync_ReturnsCourseNotFound_WhenCourseDoesNotExist()
    {
        var request = new AddCurriculumEntryRequest("Topic", null, null, null);
        var (courseFound, entry) = await _sut.AddEntryAsync(_teacherId, Guid.NewGuid(), request);

        courseFound.Should().BeFalse();
        entry.Should().BeNull();
    }

    // --- DeleteEntryAsync ---

    [Fact]
    public async Task DeleteEntryAsync_SoftDeletesAndReindexes()
    {
        var addReq1 = new AddCurriculumEntryRequest("Topic 1", null, null, null);
        var addReq2 = new AddCurriculumEntryRequest("Topic 2", null, null, null);
        var (_, e1) = await _sut.AddEntryAsync(_teacherId, _existingCourseId, addReq1);
        var (_, e2) = await _sut.AddEntryAsync(_teacherId, _existingCourseId, addReq2);

        var (courseFound, entryFound) = await _sut.DeleteEntryAsync(_teacherId, _existingCourseId, e1!.Id);

        courseFound.Should().BeTrue();
        entryFound.Should().BeTrue();

        var remaining = _db.CurriculumEntries
            .Where(x => x.CourseId == _existingCourseId && !x.IsDeleted)
            .OrderBy(x => x.OrderIndex)
            .ToList();
        remaining.Should().HaveCount(1);
        remaining[0].OrderIndex.Should().Be(1);
        remaining[0].Topic.Should().Be("Topic 2");
    }

    // --- ReorderEntriesAsync ---

    [Fact]
    public async Task ReorderEntriesAsync_ReturnsInvalidEntryIds_WhenWrongIds()
    {
        var (_, entry) = await _sut.AddEntryAsync(_teacherId, _existingCourseId, new AddCurriculumEntryRequest("T", null, null, null));
        var result = await _sut.ReorderEntriesAsync(_teacherId, _existingCourseId, new ReorderCurriculumRequest { OrderedEntryIds = [Guid.NewGuid()] });

        result.Should().Be(ReorderResult.InvalidEntryIds);
    }

    [Fact]
    public async Task ReorderEntriesAsync_ReturnsSuccess_WhenCorrectIds()
    {
        var (_, e1) = await _sut.AddEntryAsync(_teacherId, _existingCourseId, new AddCurriculumEntryRequest("T1", null, null, null));
        var (_, e2) = await _sut.AddEntryAsync(_teacherId, _existingCourseId, new AddCurriculumEntryRequest("T2", null, null, null));

        var result = await _sut.ReorderEntriesAsync(_teacherId, _existingCourseId,
            new ReorderCurriculumRequest { OrderedEntryIds = [e2!.Id, e1!.Id] });

        result.Should().Be(ReorderResult.Success);

        var entries = _db.CurriculumEntries
            .Where(x => x.CourseId == _existingCourseId && !x.IsDeleted)
            .OrderBy(x => x.OrderIndex)
            .ToList();
        entries[0].Topic.Should().Be("T2");
        entries[1].Topic.Should().Be("T1");
    }

    // --- GenerateLessonFromEntryAsync ---

    [Fact]
    public async Task GenerateLessonFromEntryAsync_CreatesLessonAndLinksEntry()
    {
        var (_, entryDto) = await _sut.AddEntryAsync(_teacherId, _existingCourseId, new AddCurriculumEntryRequest("Past Tense", "Preterite", null, null));
        var entryId = entryDto!.Id;

        var lessonId = await _sut.GenerateLessonFromEntryAsync(_teacherId, _existingCourseId, entryId);

        lessonId.Should().NotBeNull();
        var lesson = await _db.Lessons.FindAsync(lessonId!.Value);
        lesson.Should().NotBeNull();
        lesson!.Title.Should().Be("Past Tense");
        lesson.TeacherId.Should().Be(_teacherId);

        var entry = await _db.CurriculumEntries.FindAsync(entryId);
        entry!.LessonId.Should().Be(lessonId);
        entry.Status.Should().Be("created");
    }

    [Fact]
    public async Task GenerateLessonFromEntryAsync_ReturnsNull_WhenCourseNotFound()
    {
        var result = await _sut.GenerateLessonFromEntryAsync(_teacherId, Guid.NewGuid(), Guid.NewGuid());
        result.Should().BeNull();
    }
}
