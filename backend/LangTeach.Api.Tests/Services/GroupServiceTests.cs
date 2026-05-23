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

    [Fact]
    public async Task List_IncludesMemberPreviewCappedAt4()
    {
        var group = await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "Big" });
        var students = Enumerable.Range(0, 6)
            .Select(i => SeedStudent(_teacherId, $"Student{i:D2}"))
            .ToList();
        foreach (var s in students)
            await _sut.AddMemberAsync(_teacherId, group.Id, s.Id);

        var list = await _sut.ListAsync(_teacherId, new GroupListQuery());

        list.Items.Should().HaveCount(1);
        var dto = list.Items[0];
        dto.MemberCount.Should().Be(6);
        dto.MemberPreview.Should().NotBeNull();
        dto.MemberPreview!.Should().HaveCount(4);
        dto.MemberPreview.Select(m => m.Name).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task List_LastAndNextSessionDateAggregateAroundNow()
    {
        var group = await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "G" });
        var now = DateTime.UtcNow;

        _db.SessionLogs.AddRange(
            new SessionLog { Id = Guid.NewGuid(), TeacherId = _teacherId, GroupId = group.Id, SessionDate = now.AddDays(-10), CreatedAt = now, UpdatedAt = now },
            new SessionLog { Id = Guid.NewGuid(), TeacherId = _teacherId, GroupId = group.Id, SessionDate = now.AddDays(-2), CreatedAt = now, UpdatedAt = now },
            new SessionLog { Id = Guid.NewGuid(), TeacherId = _teacherId, GroupId = group.Id, SessionDate = now.AddDays(3), CreatedAt = now, UpdatedAt = now },
            new SessionLog { Id = Guid.NewGuid(), TeacherId = _teacherId, GroupId = group.Id, SessionDate = now.AddDays(7), CreatedAt = now, UpdatedAt = now }
        );
        await _db.SaveChangesAsync();

        var list = await _sut.ListAsync(_teacherId, new GroupListQuery());

        var dto = list.Items.Single();
        dto.LastSessionDate.Should().BeCloseTo(now.AddDays(-2), TimeSpan.FromSeconds(1));
        dto.NextSessionDate.Should().BeCloseTo(now.AddDays(3), TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task List_ExcludesSoftDeletedStudentsFromMemberAggregates()
    {
        var group = await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "G" });
        var s1 = SeedStudent(_teacherId, "Alice");
        var s2 = SeedStudent(_teacherId, "Bob");
        var s3 = SeedStudent(_teacherId, "Carol");
        await _sut.AddMemberAsync(_teacherId, group.Id, s1.Id);
        await _sut.AddMemberAsync(_teacherId, group.Id, s2.Id);
        await _sut.AddMemberAsync(_teacherId, group.Id, s3.Id);

        // Soft-delete Bob; he should disappear from MemberCount and MemberPreview.
        s2.IsDeleted = true;
        await _db.SaveChangesAsync();

        var list = await _sut.ListAsync(_teacherId, new GroupListQuery());

        var dto = list.Items.Single();
        dto.MemberCount.Should().Be(2);
        dto.MemberPreview!.Select(m => m.Name).Should().BeEquivalentTo(new[] { "Alice", "Carol" });
    }

    [Fact]
    public async Task List_LastAndNextSession_IgnoreDeletedCancelledAndDraft()
    {
        var group = await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "G" });
        var now = DateTime.UtcNow;

        _db.SessionLogs.AddRange(
            // Past session that is soft-deleted -- must not count as Last.
            new SessionLog { Id = Guid.NewGuid(), TeacherId = _teacherId, GroupId = group.Id, SessionDate = now.AddDays(-1), IsDeleted = true, Status = SessionLogStatus.Confirmed, CreatedAt = now, UpdatedAt = now },
            // Older past confirmed session -- this is the real Last.
            new SessionLog { Id = Guid.NewGuid(), TeacherId = _teacherId, GroupId = group.Id, SessionDate = now.AddDays(-5), Status = SessionLogStatus.Confirmed, CreatedAt = now, UpdatedAt = now },
            // Future cancelled session -- must not count as Next.
            new SessionLog { Id = Guid.NewGuid(), TeacherId = _teacherId, GroupId = group.Id, SessionDate = now.AddDays(1), IsCancelled = true, Status = SessionLogStatus.Confirmed, CreatedAt = now, UpdatedAt = now },
            // Future draft session -- must not count as Next.
            new SessionLog { Id = Guid.NewGuid(), TeacherId = _teacherId, GroupId = group.Id, SessionDate = now.AddDays(2), Status = SessionLogStatus.Draft, CreatedAt = now, UpdatedAt = now },
            // Future confirmed session -- this is the real Next.
            new SessionLog { Id = Guid.NewGuid(), TeacherId = _teacherId, GroupId = group.Id, SessionDate = now.AddDays(5), Status = SessionLogStatus.Confirmed, CreatedAt = now, UpdatedAt = now }
        );
        await _db.SaveChangesAsync();

        var list = await _sut.ListAsync(_teacherId, new GroupListQuery());

        var dto = list.Items.Single();
        dto.LastSessionDate.Should().BeCloseTo(now.AddDays(-5), TimeSpan.FromSeconds(1));
        dto.NextSessionDate.Should().BeCloseTo(now.AddDays(5), TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task List_LastAndNextSessionAreNullWhenNoSessions()
    {
        await _sut.CreateAsync(_teacherId, new CreateGroupRequest { Name = "Empty" });

        var list = await _sut.ListAsync(_teacherId, new GroupListQuery());

        var dto = list.Items.Single();
        dto.LastSessionDate.Should().BeNull();
        dto.NextSessionDate.Should().BeNull();
        dto.MemberPreview.Should().NotBeNull();
        dto.MemberPreview!.Should().BeEmpty();
    }
}
