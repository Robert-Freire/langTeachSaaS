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
        var profileSvc = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogySvc = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, profileSvc);
        _sut = new StudentService(_db, NullLogger<StudentService>.Instance, pedagogySvc);

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

    [Fact]
    public async Task GetByIdAsync_ReturnsNewProfileFields()
    {
        var request = BaseRequest();
        request.BirthYear = 1990;
        request.Profession = "Engineer";
        request.CountryOfOrigin = "Brazil";
        request.CountryOfResidence = "Spain";
        request.IsActive = true;
        request.IsCorporate = true;
        request.Rate = "25 euros";
        request.SpokenLanguages = ["French"];
        var created = await _sut.CreateAsync(_teacherId, request);

        var result = await _sut.GetByIdAsync(_teacherId, created.Id);

        result.Should().NotBeNull();
        result!.BirthYear.Should().Be(1990);
        result.Profession.Should().Be("Engineer");
        result.CountryOfOrigin.Should().Be("Brazil");
        result.CountryOfResidence.Should().Be("Spain");
        result.IsActive.Should().BeTrue();
        result.IsCorporate.Should().BeTrue();
        result.Rate.Should().Be("25 euros");
        result.SpokenLanguages.Should().BeEquivalentTo(["French"]);
    }

    [Fact]
    public async Task ListAsync_ReturnsIsActiveIsCorporateRate()
    {
        var request = BaseRequest();
        request.IsActive = false;
        request.IsCorporate = true;
        request.Rate = "40 euros";
        await _sut.CreateAsync(_teacherId, request);

        var result = await _sut.ListAsync(_teacherId, new LangTeach.Api.DTOs.StudentListQuery());

        var student = result.Items.Single();
        student.IsActive.Should().BeFalse();
        student.IsCorporate.Should().BeTrue();
        student.Rate.Should().Be("40 euros");
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
    public async Task CreateAsync_SkillLevelOverrides_RoundTrip()
    {
        var request = BaseRequest();
        request.SkillLevelOverrides = new Dictionary<string, string>
        {
            { "Reading", "B2" },
            { "Listening", "A2" },
        };

        var result = await _sut.CreateAsync(_teacherId, request);

        result.SkillLevelOverrides.Should().ContainKey("Reading").WhoseValue.Should().Be("B2");
        result.SkillLevelOverrides.Should().ContainKey("Listening").WhoseValue.Should().Be("A2");
        result.SkillLevelOverrides.Should().NotContainKey("Writing");
    }

    [Fact]
    public async Task CreateAsync_SkillLevelOverrides_InvalidKey_ThrowsValidationException()
    {
        var request = BaseRequest();
        request.SkillLevelOverrides = new Dictionary<string, string> { { "Pronunciation", "B1" } };

        var act = () => _sut.CreateAsync(_teacherId, request);

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Pronunciation*");
    }

    [Fact]
    public async Task CreateAsync_SkillLevelOverrides_InvalidValue_ThrowsValidationException()
    {
        var request = BaseRequest();
        request.SkillLevelOverrides = new Dictionary<string, string> { { "Reading", "X1" } };

        var act = () => _sut.CreateAsync(_teacherId, request);

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*X1*");
    }

    [Fact]
    public async Task UpdateAsync_SkillLevelOverrides_RoundTrip()
    {
        var created = await _sut.CreateAsync(_teacherId, BaseRequest());
        var update = new UpdateStudentRequest
        {
            Name = created.Name,
            LearningLanguage = created.LearningLanguage,
            CefrLevel = created.CefrLevel,
            SkillLevelOverrides = new Dictionary<string, string> { { "Speaking", "C1" } },
        };

        var result = await _sut.UpdateAsync(_teacherId, created.Id, update);

        result!.SkillLevelOverrides.Should().ContainKey("Speaking").WhoseValue.Should().Be("C1");
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

    [Fact]
    public async Task CreateAsync_ShortTermObjective_EmptyId_ThrowsValidationException()
    {
        var request = BaseRequest();
        request.ShortTermObjectives = [new("", "Some text", null)];

        var act = () => _sut.CreateAsync(_teacherId, request);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_ShortTermObjective_TextTooLong_ThrowsValidationException()
    {
        var request = BaseRequest();
        request.ShortTermObjectives = [new("o1", new string('x', 201), null)];

        var act = () => _sut.CreateAsync(_teacherId, request);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_ShortTermObjectives_ExceedsCap_ThrowsValidationException()
    {
        var request = BaseRequest();
        request.ShortTermObjectives = Enumerable.Range(1, 11)
            .Select(i => new ShortTermObjectiveDto($"o{i}", $"Objective {i}", null))
            .ToList();

        var act = () => _sut.CreateAsync(_teacherId, request);

        await act.Should().ThrowAsync<ValidationException>();
    }

    // TeachingTodos tests

    private static TeachingTodoDto MakeTodo(string id, string text = "Work on ser/estar", string status = "pending") =>
        new(id, text, DateTime.UtcNow, null, status, null);

    [Fact]
    public async Task TeachingTodos_JsonRoundTrip_Succeeds()
    {
        var created = await _sut.CreateAsync(_teacherId, BaseRequest());
        var updateRequest = new UpdateStudentRequest
        {
            Name = created.Name,
            LearningLanguage = created.LearningLanguage,
            CefrLevel = created.CefrLevel,
            TeachingTodos = [MakeTodo("todo-1", "Repasar pretérito"), MakeTodo("todo-2", "Artículo determinado")],
        };

        var updated = await _sut.UpdateAsync(_teacherId, created.Id, updateRequest);

        updated!.TeachingTodos.Should().HaveCount(2);
        updated.TeachingTodos[0].Id.Should().Be("todo-1");
        updated.TeachingTodos[0].Text.Should().Be("Repasar pretérito");
        updated.TeachingTodos[1].Id.Should().Be("todo-2");
    }

    [Fact]
    public async Task TeachingTodos_StatusTransition_Covered_Succeeds()
    {
        var created = await _sut.CreateAsync(_teacherId, BaseRequest());
        await _sut.UpdateAsync(_teacherId, created.Id, new UpdateStudentRequest
        {
            Name = created.Name, LearningLanguage = created.LearningLanguage, CefrLevel = created.CefrLevel,
            TeachingTodos = [MakeTodo("todo-1")],
        });

        var result = await _sut.UpdateTeachingTodoAsync(_teacherId, created.Id, "todo-1", new UpdateTeachingTodoDto("covered", null));

        result!.TeachingTodos.Single().Status.Should().Be("covered");
    }

    [Fact]
    public async Task TeachingTodos_StatusTransition_Dismissed_Succeeds()
    {
        var created = await _sut.CreateAsync(_teacherId, BaseRequest());
        await _sut.UpdateAsync(_teacherId, created.Id, new UpdateStudentRequest
        {
            Name = created.Name, LearningLanguage = created.LearningLanguage, CefrLevel = created.CefrLevel,
            TeachingTodos = [MakeTodo("todo-1")],
        });

        var result = await _sut.UpdateTeachingTodoAsync(_teacherId, created.Id, "todo-1", new UpdateTeachingTodoDto("dismissed", null));

        result!.TeachingTodos.Single().Status.Should().Be("dismissed");
    }

    [Fact]
    public async Task TeachingTodos_MaxEnforced_ThrowsValidation()
    {
        var created = await _sut.CreateAsync(_teacherId, BaseRequest());
        var todos = Enumerable.Range(1, 51).Select(i => MakeTodo($"t{i}", $"Todo {i}")).ToList();
        var updateRequest = new UpdateStudentRequest
        {
            Name = created.Name, LearningLanguage = created.LearningLanguage, CefrLevel = created.CefrLevel,
            TeachingTodos = todos,
        };

        var act = () => _sut.UpdateAsync(_teacherId, created.Id, updateRequest);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task TeachingTodos_InvalidStatus_ThrowsValidation()
    {
        var created = await _sut.CreateAsync(_teacherId, BaseRequest());
        var updateRequest = new UpdateStudentRequest
        {
            Name = created.Name, LearningLanguage = created.LearningLanguage, CefrLevel = created.CefrLevel,
            TeachingTodos = [MakeTodo("todo-1", "Some text", "invalid-status")],
        };

        var act = () => _sut.UpdateAsync(_teacherId, created.Id, updateRequest);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task UpdateTeachingTodoAsync_UnknownTodoId_ReturnsNull()
    {
        var created = await _sut.CreateAsync(_teacherId, BaseRequest());

        var result = await _sut.UpdateTeachingTodoAsync(_teacherId, created.Id, "nonexistent-id", new UpdateTeachingTodoDto("covered", null));

        result.Should().BeNull();
    }

    [Fact]
    public async Task AppendTeachingTodoAsync_WrongTeacher_ReturnsNull()
    {
        var otherTeacherId = Guid.NewGuid();
        var created = await _sut.CreateAsync(_teacherId, BaseRequest());

        var result = await _sut.AppendTeachingTodoAsync(otherTeacherId, created.Id, new CreateTeachingTodoDto("Some text", null));

        result.Should().BeNull();
    }

    [Fact]
    public async Task AppendTeachingTodoAsync_AppendsEntryWithPendingStatus()
    {
        var created = await _sut.CreateAsync(_teacherId, BaseRequest());

        var result = await _sut.AppendTeachingTodoAsync(_teacherId, created.Id, new CreateTeachingTodoDto("Trabajar ser/estar", null));

        result!.TeachingTodos.Should().HaveCount(1);
        result.TeachingTodos[0].Text.Should().Be("Trabajar ser/estar");
        result.TeachingTodos[0].Status.Should().Be("pending");
        result.TeachingTodos[0].Id.Should().NotBeNullOrEmpty();
    }
}
