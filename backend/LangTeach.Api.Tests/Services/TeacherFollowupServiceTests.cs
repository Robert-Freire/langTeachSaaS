using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Tests.Services;

public class TeacherFollowupServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly TeacherFollowupService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _otherTeacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public TeacherFollowupServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new TeacherFollowupService(_db);

        _db.Teachers.AddRange(
            new Teacher { Id = _teacherId, Auth0UserId = "auth0|t1", Email = "t1@test.com", DisplayName = "Teacher 1", IsApproved = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Teacher { Id = _otherTeacherId, Auth0UserId = "auth0|t2", Email = "t2@test.com", DisplayName = "Teacher 2", IsApproved = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        _db.Students.Add(new Student
        {
            Id = _studentId,
            TeacherId = _teacherId,
            Name = "Ewan McLeod",
            LearningLanguage = "Spanish",
            CefrLevel = "A1",
            NativeLanguages = "[\"English\"]",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task CreateAsync_AddsFollowup_ReturnableViaGetAll()
    {
        var request = new CreateTeacherFollowupRequest("Enviar ejercicio de gustar", _studentId, null, null);

        var created = await _sut.CreateAsync(_teacherId, request, default);

        created.Text.Should().Be("Enviar ejercicio de gustar");
        created.Status.Should().Be("pending");
        created.StudentId.Should().Be(_studentId.ToString());
        created.StudentName.Should().Be("Ewan McLeod");
        created.CompletedAt.Should().BeNull();

        var all = await _sut.GetAllAsync(_teacherId, default);
        all.Should().HaveCount(1);
        all[0].Id.Should().Be(created.Id);
    }

    [Fact]
    public async Task GetByStudentAsync_ReturnsOnlyThatStudentsFollowups()
    {
        var otherStudentId = Guid.NewGuid();
        _db.Students.Add(new Student
        {
            Id = otherStudentId,
            TeacherId = _teacherId,
            Name = "Bruno Almeida",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
            NativeLanguages = "[\"Portuguese\"]",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();

        await _sut.CreateAsync(_teacherId, new CreateTeacherFollowupRequest("Followup for Ewan", _studentId, null, null), default);
        await _sut.CreateAsync(_teacherId, new CreateTeacherFollowupRequest("Followup for Bruno", otherStudentId, null, null), default);

        var result = await _sut.GetByStudentAsync(_teacherId, _studentId, default);

        result.Should().HaveCount(1);
        result[0].Text.Should().Be("Followup for Ewan");
    }

    [Fact]
    public async Task UpdateStatusAsync_ToDone_SetsCompletedAt()
    {
        var created = await _sut.CreateAsync(_teacherId, new CreateTeacherFollowupRequest("Check notes", null, null, null), default);

        var updated = await _sut.UpdateStatusAsync(_teacherId, Guid.Parse(created.Id), new UpdateTeacherFollowupRequest("done"), default);

        updated.Should().NotBeNull();
        updated!.Status.Should().Be("done");
        updated.CompletedAt.Should().NotBeNull();
        updated.CompletedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task UpdateStatusAsync_BackToPending_ClearsCompletedAt()
    {
        var created = await _sut.CreateAsync(_teacherId, new CreateTeacherFollowupRequest("Check notes", null, null, null), default);
        await _sut.UpdateStatusAsync(_teacherId, Guid.Parse(created.Id), new UpdateTeacherFollowupRequest("done"), default);

        var updated = await _sut.UpdateStatusAsync(_teacherId, Guid.Parse(created.Id), new UpdateTeacherFollowupRequest("pending"), default);

        updated!.Status.Should().Be("pending");
        updated.CompletedAt.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_RemovesFollowup()
    {
        var created = await _sut.CreateAsync(_teacherId, new CreateTeacherFollowupRequest("Delete me", null, null, null), default);

        var deleted = await _sut.DeleteAsync(_teacherId, Guid.Parse(created.Id), default);

        deleted.Should().BeTrue();
        var all = await _sut.GetAllAsync(_teacherId, default);
        all.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAllAsync_TeacherIsolation_OtherTeacherCannotSeeFollowups()
    {
        await _sut.CreateAsync(_teacherId, new CreateTeacherFollowupRequest("Teacher 1 followup", null, null, null), default);

        var otherResult = await _sut.GetAllAsync(_otherTeacherId, default);

        otherResult.Should().BeEmpty();
    }

    [Fact]
    public async Task UpdateStatusAsync_WrongTeacher_ReturnsNull()
    {
        var created = await _sut.CreateAsync(_teacherId, new CreateTeacherFollowupRequest("Private followup", null, null, null), default);

        var result = await _sut.UpdateStatusAsync(_otherTeacherId, Guid.Parse(created.Id), new UpdateTeacherFollowupRequest("done"), default);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPendingAsync_ReturnsOnlyPendingFollowups()
    {
        var created = await _sut.CreateAsync(_teacherId, new CreateTeacherFollowupRequest("Pending one", null, null, null), default);
        await _sut.CreateAsync(_teacherId, new CreateTeacherFollowupRequest("Done one", null, null, null), default);
        await _sut.UpdateStatusAsync(_teacherId, Guid.Parse((await _sut.GetAllAsync(_teacherId, default))[1].Id), new UpdateTeacherFollowupRequest("done"), default);

        var pending = await _sut.GetPendingAsync(_teacherId, default);

        pending.Should().HaveCount(1);
        pending[0].Text.Should().Be("Pending one");
        pending[0].Status.Should().Be("pending");
    }

    [Fact]
    public async Task CreateAsync_WithOtherTeachersStudentId_ThrowsValidationException()
    {
        var otherStudent = Guid.NewGuid();
        _db.Students.Add(new Student
        {
            Id = otherStudent,
            TeacherId = _otherTeacherId,
            Name = "Other Teacher Student",
            LearningLanguage = "Spanish",
            CefrLevel = "A1",
            NativeLanguages = "[\"English\"]",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();

        var act = () => _sut.CreateAsync(_teacherId, new CreateTeacherFollowupRequest("Test", otherStudent, null, null), default);

        await act.Should().ThrowAsync<ValidationException>();
    }
}
