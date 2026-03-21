using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class MaterialServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly InMemoryBlobStorageService _blobStorage;
    private readonly MaterialService _sut;

    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _otherTeacherId = Guid.NewGuid();
    private readonly Guid _lessonId = Guid.NewGuid();
    private readonly Guid _sectionId = Guid.NewGuid();

    public MaterialServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _blobStorage = new InMemoryBlobStorageService();
        _sut = new MaterialService(_db, _blobStorage, NullLogger<MaterialService>.Instance);

        SeedData();
    }

    private void SeedData()
    {
        var teacher = new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|mat-test",
            Email = "mat@test.com",
            DisplayName = "Test",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Teachers.Add(teacher);

        var otherTeacher = new Teacher
        {
            Id = _otherTeacherId,
            Auth0UserId = "auth0|other",
            Email = "other@test.com",
            DisplayName = "Other",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Teachers.Add(otherTeacher);

        var lesson = new Lesson
        {
            Id = _lessonId,
            TeacherId = _teacherId,
            Title = "Test Lesson",
            Language = "Spanish",
            CefrLevel = "B1",
            Topic = "Food",
            DurationMinutes = 45,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Lessons.Add(lesson);

        var section = new LessonSection
        {
            Id = _sectionId,
            LessonId = _lessonId,
            SectionType = "WarmUp",
            OrderIndex = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.LessonSections.Add(section);
        _db.SaveChanges();
    }

    private async Task<Material> AddMaterial(string fileName, string contentType, byte[] data, Guid? sectionId = null)
    {
        var materialId = Guid.NewGuid();
        var blobPath = $"{_teacherId}/{_lessonId}/{materialId}_{fileName}";

        await using var stream = new MemoryStream(data);
        await _blobStorage.UploadAsync(stream, blobPath, contentType);

        var material = new Material
        {
            Id = materialId,
            LessonSectionId = sectionId ?? _sectionId,
            FileName = fileName,
            ContentType = contentType,
            SizeBytes = data.Length,
            BlobPath = blobPath,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Materials.Add(material);
        await _db.SaveChangesAsync();
        return material;
    }

    [Fact]
    public async Task GetMaterialContentsAsync_ReturnsMaterialsForLesson()
    {
        var pdfData = new byte[] { 0x25, 0x50, 0x44, 0x46 }; // %PDF
        var imgData = new byte[] { 0xFF, 0xD8, 0xFF }; // JPEG header
        await AddMaterial("worksheet.pdf", "application/pdf", pdfData);
        await AddMaterial("photo.jpg", "image/jpeg", imgData);

        var result = await _sut.GetMaterialContentsAsync(_teacherId, _lessonId, CancellationToken.None);

        result.Should().HaveCount(2);
        result[0].FileName.Should().Be("worksheet.pdf");
        result[0].ContentType.Should().Be("application/pdf");
        result[0].Data.Should().BeEquivalentTo(pdfData);
        result[1].FileName.Should().Be("photo.jpg");
        result[1].Data.Should().BeEquivalentTo(imgData);
    }

    [Fact]
    public async Task GetMaterialContentsAsync_ReturnsEmpty_ForWrongTeacher()
    {
        await AddMaterial("worksheet.pdf", "application/pdf", new byte[] { 1, 2, 3 });

        var result = await _sut.GetMaterialContentsAsync(_otherTeacherId, _lessonId, CancellationToken.None);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMaterialContentsAsync_ReturnsEmpty_WhenNoMaterials()
    {
        var result = await _sut.GetMaterialContentsAsync(_teacherId, _lessonId, CancellationToken.None);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMaterialContentsAsync_SkipsMaterials_WhenSizeCapExceeded()
    {
        // Add a material that is just under 20MB
        var largeData = new byte[19 * 1024 * 1024];
        await AddMaterial("big.pdf", "application/pdf", largeData);

        // Add a second material that would exceed the cap
        var smallData = new byte[2 * 1024 * 1024];
        await AddMaterial("small.pdf", "application/pdf", smallData);

        var result = await _sut.GetMaterialContentsAsync(_teacherId, _lessonId, CancellationToken.None);

        result.Should().HaveCount(1);
        result[0].FileName.Should().Be("big.pdf");
    }

    [Fact]
    public async Task GetMaterialContentsAsync_ExcludesDeletedLessons()
    {
        await AddMaterial("worksheet.pdf", "application/pdf", new byte[] { 1 });

        var lesson = await _db.Lessons.FindAsync(_lessonId);
        lesson!.IsDeleted = true;
        await _db.SaveChangesAsync();

        var result = await _sut.GetMaterialContentsAsync(_teacherId, _lessonId, CancellationToken.None);

        result.Should().BeEmpty();
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}
