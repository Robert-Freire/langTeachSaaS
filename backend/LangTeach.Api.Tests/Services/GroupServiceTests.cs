using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class GroupServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly GroupService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _otherTeacherId = Guid.NewGuid();

    public GroupServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new GroupService(_db, NullLogger<GroupService>.Instance);

        _db.Teachers.AddRange(
            new Teacher { Id = _teacherId, Auth0UserId = "auth0|t1", Email = "t1@test.com", DisplayName = "T1", IsApproved = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Teacher { Id = _otherTeacherId, Auth0UserId = "auth0|t2", Email = "t2@test.com", DisplayName = "T2", IsApproved = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private Student SeedStudent(Guid teacherId, string name = "S", string cefr = "B1")
    {
        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            Name = name,
            LearningLanguage = "Spanish",
            CefrLevel = cefr,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Students.Add(student);
        _db.SaveChanges();
        return student;
    }

    [Fact]
    public async Task Create_PersistsAndReturnsGroup()
    {
        var result = await _sut.CreateAsync(_teacherId, new CreateGroupRequest
        {
            Name = "B1.1",
            CefrLevel = "B1",
            Description = "Tuesday evenings",
        });

        result.Name.Should().Be("B1.1");
        result.CefrLevel.Should().Be("B1");
        result.MemberCount.Should().Be(0);
        result.IsActive.Should().BeTrue();
        (await _db.Groups.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Create_RejectsInvalidCefrLevel()
    {
        var act = async () => await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "X", CefrLevel = "B2+" });
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task GetById_ReturnsMembers()
    {
        var group = await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "G" });
        var s1 = SeedStudent(_teacherId, "Alice");
        var s2 = SeedStudent(_teacherId, "Bob");
        await _sut.AddMemberAsync(_teacherId, group.Id, s1.Id);
        await _sut.AddMemberAsync(_teacherId, group.Id, s2.Id);

        var detail = await _sut.GetByIdAsync(_teacherId, group.Id);

        detail.Should().NotBeNull();
        detail!.MemberCount.Should().Be(2);
        detail.Members.Should().NotBeNull();
        detail.Members!.Select(m => m.Name).Should().BeEquivalentTo(["Alice", "Bob"]);
    }

    [Fact]
    public async Task AddMember_RejectsCrossTeacherStudent()
    {
        var group = await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "G" });
        var foreignStudent = SeedStudent(_otherTeacherId);

        var act = async () => await _sut.AddMemberAsync(_teacherId, group.Id, foreignStudent.Id);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AddMember_IsIdempotent()
    {
        var group = await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "G" });
        var s = SeedStudent(_teacherId);

        await _sut.AddMemberAsync(_teacherId, group.Id, s.Id);
        var second = await _sut.AddMemberAsync(_teacherId, group.Id, s.Id);

        second!.MemberCount.Should().Be(1);
        (await _db.StudentGroups.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task RemoveMember_HardDeletes()
    {
        var group = await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "G" });
        var s = SeedStudent(_teacherId);
        await _sut.AddMemberAsync(_teacherId, group.Id, s.Id);

        var after = await _sut.RemoveMemberAsync(_teacherId, group.Id, s.Id);

        after!.MemberCount.Should().Be(0);
        (await _db.StudentGroups.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Delete_SoftDeletesAndHidesFromList()
    {
        var group = await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "G" });

        var ok = await _sut.DeleteAsync(_teacherId, group.Id);
        var list = await _sut.ListAsync(_teacherId, new GroupListQuery());

        ok.Should().BeTrue();
        list.Items.Should().BeEmpty();
        (await _db.Groups.IgnoreQueryFilters().FirstAsync(g => g.Id == group.Id)).IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task List_FiltersByCefrAndSearch()
    {
        await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "B1 Tuesdays", CefrLevel = "B1" });
        await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "B2 Thursdays", CefrLevel = "B2" });
        await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "A2 Saturdays", CefrLevel = "A2" });

        var b1 = await _sut.ListAsync(_teacherId, new GroupListQuery { CefrLevel = "B1" });
        var search = await _sut.ListAsync(_teacherId, new GroupListQuery { Search = "Thursday" });

        b1.Items.Should().HaveCount(1);
        b1.Items[0].Name.Should().Be("B1 Tuesdays");
        search.Items.Should().HaveCount(1);
        search.Items[0].Name.Should().Be("B2 Thursdays");
    }

    [Fact]
    public async Task List_ExcludesOtherTeachersGroups()
    {
        await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "Mine" });
        await _sut.CreateAsync(_otherTeacherId, new CreateGroupRequest { Name = "Theirs" });

        var list = await _sut.ListAsync(_teacherId, new GroupListQuery());

        list.Items.Should().HaveCount(1);
        list.Items[0].Name.Should().Be("Mine");
    }
}
