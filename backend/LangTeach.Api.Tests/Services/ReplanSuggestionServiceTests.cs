using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

file sealed class FakeReplanClaudeClient : IClaudeClient
{
    private readonly string? _response;
    private readonly Exception? _exception;

    public FakeReplanClaudeClient(string response) => _response = response;
    public FakeReplanClaudeClient(Exception exception) => _exception = exception;

    public Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default)
    {
        if (_exception is not null) throw _exception;
        return Task.FromResult(new ClaudeResponse(_response ?? "{}", "claude-haiku", 10, 50));
    }

    public async IAsyncEnumerable<string> StreamAsync(ClaudeRequest request,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        await Task.Yield();
        yield return "{}";
    }
}

public class ReplanSuggestionServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();
    private readonly Guid _courseId = Guid.NewGuid();
    private readonly Guid _plannedEntryId = Guid.NewGuid();
    private readonly Guid _taughtEntryId = Guid.NewGuid();
    private readonly Guid _taughtLessonId = Guid.NewGuid();

    public ReplanSuggestionServiceTests()
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(opts);
        SeedData();
    }

    private void SeedData()
    {
        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|replan-test",
            Email = "replan@test.com",
            DisplayName = "Replan Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Students.Add(new Student
        {
            Id = _studentId,
            TeacherId = _teacherId,
            Name = "Ana",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
            Difficulties = """[{"description":"subjunctive mood"}]""",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Courses.Add(new Course
        {
            Id = _courseId,
            TeacherId = _teacherId,
            StudentId = _studentId,
            Name = "Spanish B1",
            Language = "Spanish",
            TargetCefrLevel = "B1",
            SessionCount = 10,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        var taughtLesson = new Lesson
        {
            Id = _taughtLessonId,
            TeacherId = _teacherId,
            StudentId = _studentId,
            Title = "Lesson 1",
            Language = "Spanish",
            CefrLevel = "B1",
            Topic = "Present Tense",
            DurationMinutes = 60,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Lessons.Add(taughtLesson);
        _db.CurriculumEntries.AddRange(
            new CurriculumEntry
            {
                Id = _taughtEntryId,
                CourseId = _courseId,
                OrderIndex = 0,
                Topic = "Present Tense",
                Status = "taught",
                LessonId = _taughtLessonId,
                Competencies = "reading",
            },
            new CurriculumEntry
            {
                Id = _plannedEntryId,
                CourseId = _courseId,
                OrderIndex = 1,
                Topic = "Tourism Vocabulary",
                Status = "planned",
                Competencies = "speaking",
            });
        _db.LessonNotes.Add(new LessonNote
        {
            Id = Guid.NewGuid(),
            LessonId = _taughtLessonId,
            StudentId = _studentId,
            TeacherId = _teacherId,
            WhatWasCovered = "Present tense conjugation",
            AreasToImprove = "Irregular verbs, subjunctive mood",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    private ReplanSuggestionService CreateSut(string aiResponse) =>
        new(_db, new FakeReplanClaudeClient(aiResponse), NullLogger<ReplanSuggestionService>.Instance);

    // --- ParseSuggestions unit tests ---

    [Fact]
    public void ParseSuggestions_ValidJson_ReturnsSuggestions()
    {
        var sut = CreateSut("{}");
        var json = $$"""
            {"suggestions":[
                {"curriculumEntryId":"{{_plannedEntryId}}","proposedChange":"Add subjunctive review","reasoning":"Student struggled with subjunctive"},
                {"curriculumEntryId":null,"proposedChange":"More speaking time","reasoning":"Student has speaking difficulty"}
            ]}
            """;

        var result = sut.ParseSuggestions(json, _courseId, [_plannedEntryId]);

        result.Should().HaveCount(2);
        result[0].CurriculumEntryId.Should().Be(_plannedEntryId);
        result[0].ProposedChange.Should().Be("Add subjunctive review");
        result[1].CurriculumEntryId.Should().BeNull();
    }

    [Fact]
    public void ParseSuggestions_InvalidEntryId_SetsEntryIdToNull()
    {
        var sut = CreateSut("{}");
        var unknownId = Guid.NewGuid();
        var json = $$"""{"suggestions":[{"curriculumEntryId":"{{unknownId}}","proposedChange":"Change","reasoning":"Reason"}]}""";

        var result = sut.ParseSuggestions(json, _courseId, [_plannedEntryId]);

        result.Should().HaveCount(1);
        result[0].CurriculumEntryId.Should().BeNull();
    }

    [Fact]
    public void ParseSuggestions_MalformedJson_ReturnsEmpty()
    {
        var sut = CreateSut("{}");
        var result = sut.ParseSuggestions("not json at all", _courseId, []);
        result.Should().BeEmpty();
    }

    [Fact]
    public void ParseSuggestions_MissingProposedChange_SkipsItem()
    {
        var sut = CreateSut("{}");
        var json = """{"suggestions":[{"reasoning":"Only reasoning, no proposed change"}]}""";

        var result = sut.ParseSuggestions(json, _courseId, []);
        result.Should().BeEmpty();
    }

    // --- GenerateSuggestionsAsync tests ---

    [Fact]
    public async Task GenerateSuggestions_ReplacesExistingPending()
    {
        // Seed an existing pending suggestion
        _db.CourseSuggestions.Add(new CourseSuggestion
        {
            Id = Guid.NewGuid(),
            CourseId = _courseId,
            ProposedChange = "Old suggestion",
            Reasoning = "Old reason",
            Status = "pending",
            GeneratedAt = DateTime.UtcNow.AddHours(-1),
        });
        await _db.SaveChangesAsync();

        var json = $$"""{"suggestions":[{"curriculumEntryId":null,"proposedChange":"New suggestion","reasoning":"New reason"}]}""";
        var sut = CreateSut(json);

        var result = await sut.GenerateSuggestionsAsync(_courseId, _teacherId);

        // Old pending replaced by new one
        var allPending = await _db.CourseSuggestions
            .Where(s => s.CourseId == _courseId && s.Status == "pending")
            .ToListAsync();
        allPending.Should().HaveCount(1);
        allPending[0].ProposedChange.Should().Be("New suggestion");

        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task GenerateSuggestions_ThrowsOnUnknownCourse()
    {
        var sut = CreateSut("""{"suggestions":[]}""");
        var act = () => sut.GenerateSuggestionsAsync(Guid.NewGuid(), _teacherId);
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    // --- RespondAsync tests ---

    [Fact]
    public async Task RespondAccept_SetsStatusAndAppliesPersonalizationNotes()
    {
        var suggestionId = Guid.NewGuid();
        _db.CourseSuggestions.Add(new CourseSuggestion
        {
            Id = suggestionId,
            CourseId = _courseId,
            CurriculumEntryId = _plannedEntryId,
            ProposedChange = "Add subjunctive drill",
            Reasoning = "Gap detected",
            Status = "pending",
            GeneratedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var sut = CreateSut("{}");
        var result = await sut.RespondAsync(_courseId, suggestionId, _teacherId, "accept", null);

        result.Should().NotBeNull();
        result!.Status.Should().Be("accepted");
        result.RespondedAt.Should().NotBeNull();

        var entry = await _db.CurriculumEntries.FindAsync(_plannedEntryId);
        entry!.PersonalizationNotes.Should().Contain("Add subjunctive drill");
        entry.PersonalizationNotes.Should().StartWith("[Adaptive replan]");
    }

    [Fact]
    public async Task RespondAcceptWithEdit_AppliesTeacherEditToPersonalizationNotes()
    {
        var suggestionId = Guid.NewGuid();
        _db.CourseSuggestions.Add(new CourseSuggestion
        {
            Id = suggestionId,
            CourseId = _courseId,
            CurriculumEntryId = _plannedEntryId,
            ProposedChange = "Original proposal",
            Reasoning = "Reason",
            Status = "pending",
            GeneratedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var sut = CreateSut("{}");
        var result = await sut.RespondAsync(_courseId, suggestionId, _teacherId, "accept", "Edited by teacher");

        result!.TeacherEdit.Should().Be("Edited by teacher");

        var entry = await _db.CurriculumEntries.FindAsync(_plannedEntryId);
        entry!.PersonalizationNotes.Should().Contain("Edited by teacher");
        entry.PersonalizationNotes.Should().NotContain("Original proposal");
    }

    [Fact]
    public async Task RespondDismiss_SetsStatusDismissed()
    {
        var suggestionId = Guid.NewGuid();
        _db.CourseSuggestions.Add(new CourseSuggestion
        {
            Id = suggestionId,
            CourseId = _courseId,
            ProposedChange = "Suggestion",
            Reasoning = "Reason",
            Status = "pending",
            GeneratedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var sut = CreateSut("{}");
        var result = await sut.RespondAsync(_courseId, suggestionId, _teacherId, "dismiss", null);

        result!.Status.Should().Be("dismissed");
        result.RespondedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Respond_ReturnsNullForUnknownSuggestion()
    {
        var sut = CreateSut("{}");
        var result = await sut.RespondAsync(_courseId, Guid.NewGuid(), _teacherId, "accept", null);
        result.Should().BeNull();
    }

    [Fact]
    public async Task RespondAccept_AppendsToPreviousPersonalizationNotes()
    {
        // Pre-set existing notes on the entry
        var entry = await _db.CurriculumEntries.FindAsync(_plannedEntryId);
        entry!.PersonalizationNotes = "Existing note";
        await _db.SaveChangesAsync();

        var suggestionId = Guid.NewGuid();
        _db.CourseSuggestions.Add(new CourseSuggestion
        {
            Id = suggestionId,
            CourseId = _courseId,
            CurriculumEntryId = _plannedEntryId,
            ProposedChange = "New replan note",
            Reasoning = "Reason",
            Status = "pending",
            GeneratedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var sut = CreateSut("{}");
        await sut.RespondAsync(_courseId, suggestionId, _teacherId, "accept", null);

        var updated = await _db.CurriculumEntries.FindAsync(_plannedEntryId);
        updated!.PersonalizationNotes.Should().Contain("Existing note");
        updated.PersonalizationNotes.Should().Contain("New replan note");
    }

    public void Dispose() => _db.Dispose();
}
