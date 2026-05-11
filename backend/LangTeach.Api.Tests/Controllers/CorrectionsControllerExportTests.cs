using System.Net;
using System.Net.Http.Json;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class CorrectionsControllerExportTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public CorrectionsControllerExportTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Export_ReturnsDocx_ForCorregidaCorrection()
    {
        var (client, studentId, correctionId) = await SetupCorregidaAsync("auth0|export-ok");

        var resp = await client.GetAsync($"/api/students/{studentId}/corrections/{correctionId}/export.docx");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        resp.Content.Headers.ContentType!.MediaType.Should()
            .Be("application/vnd.openxmlformats-officedocument.wordprocessingml.document");

        var disposition = resp.Content.Headers.ContentDisposition!;
        disposition.DispositionType.Should().Be("attachment");
        disposition.FileName.Should().StartWith("redaccion-").And.EndWith(".docx");

        var bytes = await resp.Content.ReadAsByteArrayAsync();
        bytes.Length.Should().BeGreaterThan(0).And.BeLessThan(100_000);

        // Verify it parses as a real docx.
        using var stream = new MemoryStream(bytes);
        WordprocessingDocument.Open(stream, isEditable: false).Dispose();
    }

    [Fact]
    public async Task Export_NonExistentCorrection_Returns404()
    {
        var (client, studentId) = await SetupAsync("auth0|export-missing");

        var resp = await client.GetAsync($"/api/students/{studentId}/corrections/{Guid.NewGuid()}/export.docx");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Export_OtherTeachersCorrection_Returns404()
    {
        var (clientA, studentA, correctionId) = await SetupCorregidaAsync("auth0|export-rls-a", "rls-a@example.com");
        var clientB = _factory.CreateAuthenticatedClient("auth0|export-rls-b", "rls-b@example.com");

        var resp = await clientB.GetAsync($"/api/students/{studentA}/corrections/{correctionId}/export.docx");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Export_PendienteCorrection_Returns409()
    {
        var (client, studentId) = await SetupAsync("auth0|export-pendiente");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Pendiente test",
        });

        var resp = await client.GetAsync($"/api/students/{studentId}/corrections/{created.Id}/export.docx");
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Export_EntregadaCorrection_Returns409()
    {
        var (client, studentId) = await SetupAsync("auth0|export-entregada");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Entregada test",
            StudentText = "Some text.",
        });
        // Status is Entregada (has text, not yet corregida).
        created.Status.Should().Be("Entregada");

        var resp = await client.GetAsync($"/api/students/{studentId}/corrections/{created.Id}/export.docx");
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Export_FilenameSlugifiesAccentedNames()
    {
        const string accentedName = "María José Núñez";
        var auth0Id = "auth0|export-accented";
        var client = _factory.CreateAuthenticatedClient(auth0Id, "accented@example.com");

        // Create student with accented name directly.
        var createResp = await client.PostAsJsonAsync("/api/students", new CreateStudentRequest
        {
            Name = accentedName,
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
        });
        createResp.EnsureSuccessStatusCode();
        var student = (await createResp.Content.ReadFromJsonAsync<StudentDto>())!;

        var correction = await CreateCorrectionAsync(client, student.Id, new CreateCorrectionRequest
        {
            AssignmentTitle = "Test",
            StudentText = "Hola.",
        });
        await ForceCorregidaAsync(correction.Id);

        var resp = await client.GetAsync($"/api/students/{student.Id}/corrections/{correction.Id}/export.docx");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var disposition = resp.Content.Headers.ContentDisposition!;
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        disposition.FileName.Should().Be($"redaccion-maria-jose-nunez-{today}.docx");
        disposition.FileNameStar.Should().Contain(accentedName);
    }

    [Fact]
    public async Task Export_DocxIsParseable_AndContainsExpectedColoredRuns()
    {
        var (client, studentId, correctionId) = await SetupCorregidaAsync("auth0|export-runs");

        var resp = await client.GetAsync($"/api/students/{studentId}/corrections/{correctionId}/export.docx");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var bytes = await resp.Content.ReadAsByteArrayAsync();

        using var stream = new MemoryStream(bytes);
        using var doc = WordprocessingDocument.Open(stream, isEditable: false);
        var runs = doc.MainDocumentPart!.Document!.Body!.Descendants<Run>().ToList();

        // Section 1: O-category tag "ablar" -> emerald-500 10B981, underlined (not bold)
        var coloredRun = runs.FirstOrDefault(r =>
            r.RunProperties?.Color?.Val?.Value == "10B981"
            && r.RunProperties?.Underline is not null);
        coloredRun.Should().NotBeNull("the docx must include the underlined colored run for the O tag");

        var allText = string.Concat(runs.SelectMany(r => r.Descendants<Text>()).Select(t => t.Text));
        allText.Should().NotContain("(O) corrección:", "old inline parenthetical format must not appear");
        // Section 2: numbered corrections list
        allText.Should().Contain("[O]");
        allText.Should().Contain("hablar");
    }

    // --- helpers ---

    private async Task<(HttpClient client, Guid studentId)> SetupAsync(string auth0Id, string? email = null)
    {
        var client = _factory.CreateAuthenticatedClient(auth0Id, email ?? $"{auth0Id.Replace("|", "-")}@example.com");
        var studentResp = await client.PostAsJsonAsync("/api/students", new CreateStudentRequest
        {
            Name = "Test Student",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
        });
        studentResp.EnsureSuccessStatusCode();
        var student = (await studentResp.Content.ReadFromJsonAsync<StudentDto>())!;
        return (client, student.Id);
    }

    private async Task<(HttpClient client, Guid studentId, Guid correctionId)> SetupCorregidaAsync(string auth0Id, string? email = null)
    {
        var (client, studentId) = await SetupAsync(auth0Id, email);
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Hoy ablar con mi amigo.",
            StudentText = "Hoy ablar con mi amigo.",
        });
        await ForceCorregidaAsync(created.Id);
        return (client, studentId, created.Id);
    }

    private static async Task<CorrectionDetailDto> CreateCorrectionAsync(HttpClient client, Guid studentId, CreateCorrectionRequest req)
    {
        var resp = await client.PostAsJsonAsync($"/api/students/{studentId}/corrections", req);
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>())!;
    }

    private Task ForceCorregidaAsync(Guid correctionId)
    {
        // Drive the correction to Corregida directly via the DbContext to keep export
        // tests focused on the export endpoint rather than the AI generation pipeline.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = db.Corrections.First(c => c.Id == correctionId);
        row.Status = CorrectionStatus.Corregida;
        row.CorrectedAt = DateTime.UtcNow;
        row.MarkedUpOutput = "{}";
        var text = row.StudentText ?? "Hoy ablar con mi amigo.";
        var idx = text.IndexOf("ablar", StringComparison.Ordinal);
        if (idx >= 0)
        {
            db.CorrectionTags.Add(new CorrectionTag
            {
                Id = Guid.NewGuid(),
                CorrectionId = correctionId,
                Category = CorrectionTagCategory.Ortografia,
                SpannedText = "ablar",
                StartIndex = idx,
                EndIndex = idx + "ablar".Length,
                Explanation = "Falta la 'h'.",
                CorrectedForm = "hablar",
                OrderIndex = 0,
            });
        }
        db.SaveChanges();
        return Task.CompletedTask;
    }
}
