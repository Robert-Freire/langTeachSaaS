using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class AssistantTargetResolverTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly GroupService _groupService;
    private readonly AssistantTargetResolver _sut;
    private readonly Guid _teacherId = Guid.NewGuid();

    public AssistantTargetResolverTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _groupService = new GroupService(_db, NullLogger<GroupService>.Instance);
        _sut = new AssistantTargetResolver(_groupService);

        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId, Auth0UserId = "auth0|t1", Email = "t1@test.com",
            DisplayName = "T1", IsApproved = true,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    private Guid AddGroup(string name, string? cefrLevel, string[]? aliases = null)
    {
        var id = Guid.NewGuid();
        _db.Groups.Add(new Group
        {
            Id = id,
            TeacherId = _teacherId,
            Name = name,
            CefrLevel = cefrLevel,
            IsActive = true,
            IsDeleted = false,
            Aliases = JsonStorageHelper.Serialize((aliases ?? []).ToList()),
            Interests = "[]",
            CommonFocusAreas = "[]",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
        return id;
    }

    [Fact]
    public async Task ExactNameMatch_UniqueGroup_ReturnsConfident()
    {
        var id = AddGroup("B1.1", "B1");
        var result = await _sut.ResolveAsync("B1.1", _teacherId);
        result.IsConfident.Should().BeTrue();
        result.Target.ResolvedId.Should().Be(id);
        result.Target.Kind.Should().Be("group");
    }

    [Fact]
    public async Task ExactNameMatch_CaseInsensitive_ReturnsConfident()
    {
        var id = AddGroup("B1.1", "B1");
        var result = await _sut.ResolveAsync("b1.1", _teacherId);
        result.IsConfident.Should().BeTrue();
        result.Target.ResolvedId.Should().Be(id);
    }

    [Fact]
    public async Task AliasMatch_KnownAlias_ReturnsConfident()
    {
        var id = AddGroup("Lunes B1", "B1", ["Lunes", "los del lunes"]);
        var result = await _sut.ResolveAsync("Lunes", _teacherId);
        result.IsConfident.Should().BeTrue();
        result.Target.ResolvedId.Should().Be(id);
    }

    [Fact]
    public async Task AliasMatch_MultiWordAlias_ReturnsConfident()
    {
        var id = AddGroup("Lunes B1", "B1", ["Lunes", "los del lunes"]);
        var result = await _sut.ResolveAsync("los del lunes", _teacherId);
        result.IsConfident.Should().BeTrue();
        result.Target.ResolvedId.Should().Be(id);
    }

    [Theory]
    [InlineData("be uno punto uno", "B1.1")]
    [InlineData("be dos", "B2")]
    [InlineData("b dos", "B2")]
    [InlineData("a uno", "A1")]
    [InlineData("a dos", "A2")]
    [InlineData("be uno", "B1")]
    public void TryNormalizeSpoken_ValidInput_ReturnsCanonical(string input, string expected)
    {
        var result = AssistantTargetResolver.TryNormalizeSpoken(input);
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("hola")]
    [InlineData("B1.1")]
    [InlineData("x dos")]
    [InlineData("be")]
    public void TryNormalizeSpoken_InvalidInput_ReturnsNull(string input)
    {
        var result = AssistantTargetResolver.TryNormalizeSpoken(input);
        result.Should().BeNull();
    }

    [Fact]
    public async Task SpokenNormalization_BeUnoPuntoUno_ResolvesToGroup()
    {
        var id = AddGroup("B1.1", "B1");
        var result = await _sut.ResolveAsync("be uno punto uno", _teacherId);
        result.IsConfident.Should().BeTrue();
        result.Target.ResolvedId.Should().Be(id);
    }

    [Fact]
    public async Task SpokenNormalization_BeDos_ResolvesToB2Group()
    {
        var id = AddGroup("B2", "B2");
        var result = await _sut.ResolveAsync("be dos", _teacherId);
        result.IsConfident.Should().BeTrue();
        result.Target.ResolvedId.Should().Be(id);
    }

    [Fact]
    public async Task NoMatch_ReturnsNotConfidentEmptyCandidates()
    {
        AddGroup("B1.1", "B1");
        var result = await _sut.ResolveAsync("grupo inexistente xyz123", _teacherId);
        result.IsConfident.Should().BeFalse();
        result.Target.ResolvedId.Should().BeNull();
        result.Target.Candidates.Should().BeEmpty();
    }

    [Fact]
    public async Task EmptyGroups_ReturnsNotConfident()
    {
        var result = await _sut.ResolveAsync("B1.1", _teacherId);
        result.IsConfident.Should().BeFalse();
        result.Target.ResolvedId.Should().BeNull();
    }

    [Fact]
    public async Task AmbiguousExactName_MultipleMatches_ReturnsNotConfident()
    {
        AddGroup("B1", "B1");
        AddGroup("B1", "B1");
        var result = await _sut.ResolveAsync("B1", _teacherId);
        result.IsConfident.Should().BeFalse();
        result.Target.Candidates.Should().HaveCount(2);
    }

    [Fact]
    public async Task InactiveGroup_NotIncluded()
    {
        _db.Groups.Add(new Group
        {
            Id = Guid.NewGuid(),
            TeacherId = _teacherId,
            Name = "InactiveGroup",
            IsActive = false,
            IsDeleted = false,
            Aliases = "[]",
            Interests = "[]",
            CommonFocusAreas = "[]",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();

        var result = await _sut.ResolveAsync("InactiveGroup", _teacherId);
        result.IsConfident.Should().BeFalse();
    }

    [Fact]
    public async Task RawMentionPreserved_InTarget()
    {
        AddGroup("B1.1", "B1");
        var result = await _sut.ResolveAsync("be uno punto uno", _teacherId);
        result.Target.RawMention.Should().Be("be uno punto uno");
    }

    [Fact]
    public async Task ResolveByIdAsync_KnownGroup_ReturnsConfidentWithGroupNameAndLevel()
    {
        var id = AddGroup("B1 Intensivo", "B1");
        var result = await _sut.ResolveByIdAsync(id, _teacherId);
        result.Should().NotBeNull();
        result!.IsConfident.Should().BeTrue();
        result.Target.ResolvedId.Should().Be(id);
        result.ResolvedGroupName.Should().Be("B1 Intensivo");
        result.ResolvedCefrLevel.Should().Be("B1");
    }

    [Fact]
    public async Task ResolveByIdAsync_UnknownId_ReturnsNull()
    {
        var result = await _sut.ResolveByIdAsync(Guid.NewGuid(), _teacherId);
        result.Should().BeNull();
    }

    public void Dispose() => _db.Dispose();
}
