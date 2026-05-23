using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Tests.Services;

public class SessionLogQueriesTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _otherTeacherId = Guid.NewGuid();

    public SessionLogQueriesTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _db.Teachers.AddRange(
            new Teacher { Id = _teacherId, Auth0UserId = "auth0|t1", Email = "t1@test.com", DisplayName = "T1", IsApproved = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Teacher { Id = _otherTeacherId, Auth0UserId = "auth0|t2", Email = "t2@test.com", DisplayName = "T2", IsApproved = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private Student MakeStudent(Guid? teacherId = null)
    {
        var s = new Student { Id = Guid.NewGuid(), TeacherId = teacherId ?? _teacherId, Name = "S", LearningLanguage = "Spanish", CefrLevel = "B1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _db.Students.Add(s);
        return s;
    }

    private Group MakeGroup(Guid? teacherId = null)
    {
        var g = new Group { Id = Guid.NewGuid(), TeacherId = teacherId ?? _teacherId, Name = "G", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _db.Groups.Add(g);
        return g;
    }

    private SessionLog MakeSession(Guid teacherId, Guid? studentId, Guid? groupId, string title)
    {
        var sl = new SessionLog
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            StudentId = studentId,
            GroupId = groupId,
            Title = title,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            SessionDate = DateTime.UtcNow,
        };
        _db.SessionLogs.Add(sl);
        return sl;
    }

    [Fact]
    public async Task ForStudentIncludingGroups_NoGroupMembership_ReturnsOnlySoloSessions()
    {
        var s = MakeStudent();
        MakeSession(_teacherId, s.Id, null, "solo");
        _db.SaveChanges();

        var result = await SessionLogQueries.ForStudentIncludingGroups(_db, _teacherId, s.Id).ToListAsync();

        result.Should().HaveCount(1);
        result[0].Title.Should().Be("solo");
    }

    [Fact]
    public async Task ForStudentIncludingGroups_OneGroup_IncludesSoloAndGroupSessions()
    {
        var s = MakeStudent();
        var g = MakeGroup();
        _db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = g.Id, CreatedAt = DateTime.UtcNow });
        MakeSession(_teacherId, s.Id, null, "solo");
        MakeSession(_teacherId, null, g.Id, "group");
        _db.SaveChanges();

        var result = await SessionLogQueries.ForStudentIncludingGroups(_db, _teacherId, s.Id).ToListAsync();

        result.Select(r => r.Title).Should().BeEquivalentTo(["solo", "group"]);
    }

    [Fact]
    public async Task ForStudentIncludingGroups_ExcludesSessionsFromGroupsStudentIsNotIn()
    {
        var s = MakeStudent();
        var gInMembership = MakeGroup();
        var gNotIn = MakeGroup();
        _db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = gInMembership.Id, CreatedAt = DateTime.UtcNow });
        MakeSession(_teacherId, null, gInMembership.Id, "in");
        MakeSession(_teacherId, null, gNotIn.Id, "out");
        _db.SaveChanges();

        var result = await SessionLogQueries.ForStudentIncludingGroups(_db, _teacherId, s.Id).ToListAsync();

        result.Should().HaveCount(1);
        result[0].Title.Should().Be("in");
    }

    [Fact]
    public async Task ForStudentIncludingGroups_ExcludesOtherTeachers()
    {
        var s = MakeStudent();
        var foreign = MakeGroup(_otherTeacherId);
        MakeSession(_otherTeacherId, null, foreign.Id, "foreign");
        MakeSession(_teacherId, s.Id, null, "mine");
        _db.SaveChanges();

        var result = await SessionLogQueries.ForStudentIncludingGroups(_db, _teacherId, s.Id).ToListAsync();

        result.Should().HaveCount(1);
        result[0].Title.Should().Be("mine");
    }

    [Fact]
    public async Task ForStudentIncludingGroups_ExcludesSoftDeleted()
    {
        var s = MakeStudent();
        var deleted = MakeSession(_teacherId, s.Id, null, "deleted");
        deleted.IsDeleted = true;
        MakeSession(_teacherId, s.Id, null, "live");
        _db.SaveChanges();

        var result = await SessionLogQueries.ForStudentIncludingGroups(_db, _teacherId, s.Id).ToListAsync();

        result.Should().HaveCount(1);
        result[0].Title.Should().Be("live");
    }
}
