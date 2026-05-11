using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LangTeach.Api.DTOs;
using LangTeach.Api.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class CorrectionsControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public CorrectionsControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Create_WithTitleOnly_ReturnsPendiente()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-create-title");

        var resp = await client.PostAsJsonAsync(
            $"/api/students/{studentId}/corrections",
            new CreateCorrectionRequest { AssignmentTitle = "Carta a un extraterrestre" });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var detail = await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>();
        detail!.Status.Should().Be("Pendiente");
        detail.AssignmentTitle.Should().Be("Carta a un extraterrestre");
        detail.StudentText.Should().BeNull();
        detail.MarkedUpOutput.Should().BeNull();
        detail.SchemaVersion.Should().Be(1);
        resp.Headers.Location.Should().NotBeNull();
    }

    [Fact]
    public async Task Create_WithStudentText_ReturnsEntregada()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-create-text");

        var resp = await client.PostAsJsonAsync(
            $"/api/students/{studentId}/corrections",
            new CreateCorrectionRequest
            {
                AssignmentTitle = "Diálogo en un café",
                AssignmentPrompt = "Pide un café y conversa con el camarero.",
                StudentText = "Hola, quiero un café por favor.",
            });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var detail = await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>();
        detail!.Status.Should().Be("Entregada");
        detail.StudentText.Should().Be("Hola, quiero un café por favor.");
    }

    [Fact]
    public async Task Create_BlankTitle_DefaultsToRedaccionDate()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-default-title");

        var resp = await client.PostAsJsonAsync(
            $"/api/students/{studentId}/corrections",
            new CreateCorrectionRequest { AssignmentTitle = "  " });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var detail = await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>();
        detail!.AssignmentTitle.Should().Be($"Redacción {DateTime.UtcNow:yyyy-MM-dd}");
    }

    [Fact]
    public async Task Patch_AddingStudentText_TransitionsPendienteToEntregada()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-patch-text");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "Mi día" });
        created.Status.Should().Be("Pendiente");

        var resp = await client.PatchAsJsonAsync(
            $"/api/students/{studentId}/corrections/{created.Id}",
            new UpdateCorrectionRequest { StudentText = "Hoy fui al parque." });

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>();
        detail!.Status.Should().Be("Entregada");
        detail.StudentText.Should().Be("Hoy fui al parque.");
    }

    [Fact]
    public async Task Corregir_OnEntregada_ReturnsCorrigiendoImmediately_ThenFlipsToCorregida()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-corregir-ok");
        var text = "Hoy ablar con mi amigo.";
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Stub test",
            StudentText = text,
        });

        _factory.ClaudeStub.Reset();
        _factory.ClaudeStub.EnqueueResponse(BuildSampleAiJson(text));

        var resp = await client.PostAsync(
            $"/api/students/{studentId}/corrections/{created.Id}/corregir",
            content: null);

        // Endpoint returns immediately with Corrigiendo; background task fires asynchronously.
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var immediate = await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>();
        immediate!.Status.Should().Be("Corrigiendo");

        // Background task (stub: synchronous, no network) should complete within a few hundred ms.
        var detail = await WaitForCorrectionStatusAsync(client, studentId, created.Id, "Corregida");
        detail.CorrectedAt.Should().NotBeNull();
        detail.Tags.Should().HaveCount(1);
        detail.Tags[0].Category.Should().Be("O");
        detail.MarkedUpOutput.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Corregir_OnPendiente_Returns409NoStudentText()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-corregir-pendiente");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Pendiente test",
        });
        created.Status.Should().Be("Pendiente");

        var resp = await client.PostAsync(
            $"/api/students/{studentId}/corrections/{created.Id}/corregir",
            content: null);

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Corregir_OnAlreadyCorregida_Returns409()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-corregir-already");
        var text = "Texto ya corregido.";
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Already test",
            StudentText = text,
        });

        _factory.ClaudeStub.Reset();
        _factory.ClaudeStub.EnqueueResponse(BuildEmptyAiJson(text));

        var first = await client.PostAsync(
            $"/api/students/{studentId}/corrections/{created.Id}/corregir",
            content: null);
        first.StatusCode.Should().Be(HttpStatusCode.OK);

        // Wait for the background task to flip status to Corregida before the second call.
        await WaitForCorrectionStatusAsync(client, studentId, created.Id, "Corregida");

        var second = await client.PostAsync(
            $"/api/students/{studentId}/corrections/{created.Id}/corregir",
            content: null);
        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Corregir_OnCorrigiendo_Returns200Idempotent()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-corregir-idempotent");
        var text = "El niño juega en el parque.";
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Idempotent test",
            StudentText = text,
        });

        // Force Corrigiendo status directly via DB.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LangTeach.Api.Data.AppDbContext>();
            var row = db.Corrections.First(c => c.Id == created.Id);
            row.Status = LangTeach.Api.Data.Models.CorrectionStatus.Corrigiendo;
            db.SaveChanges();
        }

        _factory.ClaudeStub.Reset();

        var resp = await client.PostAsync(
            $"/api/students/{studentId}/corrections/{created.Id}/corregir",
            content: null);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>();
        detail!.Status.Should().Be("Corrigiendo");
        _factory.ClaudeStub.CompleteCallCount.Should().Be(0, "idempotent path must not trigger a second AI call");
    }

    [Fact]
    public async Task Corregir_OnEntregada_ReturnsCorrigiendoEvenWhenAiFails()
    {
        // Endpoint fires background task and returns immediately. AI failure is silent;
        // staleness recovery eventually resets to Entregada on the next GET.
        var (client, studentId) = await SetupAsync("auth0|corr-corregir-badjson");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Bad json",
            StudentText = "Texto del estudiante.",
        });

        _factory.ClaudeStub.Reset();
        _factory.ClaudeStub.EnqueueResponse("This is not JSON at all.");

        var preCallTime = created.UpdatedAt;

        var resp = await client.PostAsync(
            $"/api/students/{studentId}/corrections/{created.Id}/corregir",
            content: null);
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>();
        detail!.Status.Should().Be("Corrigiendo");

        // Wait for the background task to consume the stub response (bad JSON).
        // This prevents the stub queue from racing with the next test in the collection.
        await WaitForCorrectionStatusAsync(client, studentId, created.Id, "Corrigiendo",
            maxWaitMs: 2000, stopWhenUpdatedAtAdvances: preCallTime);
    }

    [Fact]
    public async Task List_StaleCorrigiendo_ReturnedAsIs()
    {
        // ListAsync is a pure read -- stale-recovery is now handled by CorrectionStaleRecoveryService
        // (see CorrectionStaleRecoveryServiceTests). The list endpoint returns the current status
        // without mutating it.
        var (client, studentId) = await SetupAsync("auth0|corr-staleness");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Staleness test",
            StudentText = "Texto para comprobar el mecanismo de staleness.",
        });

        // Force Corrigiendo with an old UpdatedAt to simulate a stuck background task.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LangTeach.Api.Data.AppDbContext>();
            var row = db.Corrections.First(c => c.Id == created.Id);
            row.Status = LangTeach.Api.Data.Models.CorrectionStatus.Corrigiendo;
            row.UpdatedAt = DateTime.UtcNow.AddMinutes(-10); // > StaleCorrigiendoSeconds (360s)
            db.SaveChanges();
        }

        var listResp = await client.GetAsync($"/api/students/{studentId}/corrections");
        listResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var list = await listResp.Content.ReadFromJsonAsync<List<CorrectionSummaryDto>>();
        list!.Should().ContainSingle(c => c.Id == created.Id && c.Status == "Corrigiendo");
    }

    [Fact]
    public async Task ColdPaste_CreateThenCorregir_FlipsToCorregida()
    {
        // Pins the cold-paste flow described in the sprint story.
        var (client, studentId) = await SetupAsync("auth0|corr-cold-paste");

        var text = "El sábado fui al cine y el domingo descansé.";
        var createResp = await client.PostAsJsonAsync(
            $"/api/students/{studentId}/corrections",
            new CreateCorrectionRequest
            {
                AssignmentTitle = "Cold paste",
                AssignmentPrompt = "Describe tu fin de semana.",
                StudentText = text,
            });
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var detail = (await createResp.Content.ReadFromJsonAsync<CorrectionDetailDto>())!;
        detail.Status.Should().Be("Entregada");

        _factory.ClaudeStub.Reset();
        _factory.ClaudeStub.EnqueueResponse(BuildEmptyAiJson(text));

        var corregirResp = await client.PostAsync(
            $"/api/students/{studentId}/corrections/{detail.Id}/corregir",
            content: null);
        corregirResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var immediate = await corregirResp.Content.ReadFromJsonAsync<CorrectionDetailDto>();
        immediate!.Status.Should().Be("Corrigiendo");

        var corrected = await WaitForCorrectionStatusAsync(client, studentId, detail.Id, "Corregida");
        corrected.Status.Should().Be("Corregida");
    }

    private static string BuildSampleAiJson(string originalText)
    {
        // "ablar" misspelling (without the h) at index 4 in "Hoy ablar con mi amigo." -> O
        var idx = originalText.IndexOf("ablar", StringComparison.Ordinal);
        return System.Text.Json.JsonSerializer.Serialize(new
        {
            schemaVersion = 1,
            originalText,
            tags = new[]
            {
                new
                {
                    category = "O",
                    startIndex = idx,
                    endIndex = idx + "ablar".Length,
                    spannedText = "ablar",
                    explanation = "Falta la 'h'. El verbo es 'hablar'.",
                    correctedForm = "hablar",
                }
            }
        });
    }

    private static string BuildEmptyAiJson(string originalText) =>
        System.Text.Json.JsonSerializer.Serialize(new
        {
            schemaVersion = 1,
            originalText,
            tags = Array.Empty<object>(),
        });

    private static string BuildDriftedOffsetAiJson(string originalText, string spannedText, int driftedStartIndex) =>
        System.Text.Json.JsonSerializer.Serialize(new
        {
            schemaVersion = 1,
            originalText,
            tags = new[]
            {
                new
                {
                    category = "O",
                    startIndex = driftedStartIndex,
                    endIndex = driftedStartIndex + spannedText.Length,
                    spannedText,
                    explanation = "Ejemplo de tilde correcta; sirve para probar el rescate de offsets.",
                    correctedForm = spannedText,
                }
            }
        });

    [Fact]
    public async Task List_ExcludesSoftDeleted()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-soft-delete");
        var keep = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "Keep" });
        var drop = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "Drop" });

        var del = await client.DeleteAsync($"/api/students/{studentId}/corrections/{drop.Id}");
        del.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResp = await client.GetAsync($"/api/students/{studentId}/corrections");
        listResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var list = await listResp.Content.ReadFromJsonAsync<List<CorrectionSummaryDto>>();
        list!.Select(x => x.Id).Should().ContainSingle().And.BeEquivalentTo([keep.Id]);
    }

    [Fact]
    public async Task GetById_AfterDelete_Returns404()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-get-after-delete");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "Doomed" });

        var delResp = await client.DeleteAsync($"/api/students/{studentId}/corrections/{created.Id}");
        delResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResp = await client.GetAsync($"/api/students/{studentId}/corrections/{created.Id}");
        getResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_OtherTeacher_Returns404()
    {
        var (clientA, studentA) = await SetupAsync("auth0|corr-rls-a", "rls-a@example.com");
        var clientB = _factory.CreateAuthenticatedClient("auth0|corr-rls-b", "rls-b@example.com");

        var created = await CreateCorrectionAsync(clientA, studentA, new CreateCorrectionRequest { AssignmentTitle = "Private" });

        var resp = await clientB.GetAsync($"/api/students/{studentA}/corrections/{created.Id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Patch_OtherTeacher_Returns404()
    {
        var (clientA, studentA) = await SetupAsync("auth0|corr-rls-patch-a", "rls-patch-a@example.com");
        var clientB = _factory.CreateAuthenticatedClient("auth0|corr-rls-patch-b", "rls-patch-b@example.com");

        var created = await CreateCorrectionAsync(clientA, studentA, new CreateCorrectionRequest { AssignmentTitle = "Private" });

        var resp = await clientB.PatchAsJsonAsync(
            $"/api/students/{studentA}/corrections/{created.Id}",
            new UpdateCorrectionRequest { AssignmentTitle = "Hijack" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_OtherTeacher_Returns404()
    {
        var (clientA, studentA) = await SetupAsync("auth0|corr-rls-del-a", "rls-del-a@example.com");
        var clientB = _factory.CreateAuthenticatedClient("auth0|corr-rls-del-b", "rls-del-b@example.com");

        var created = await CreateCorrectionAsync(clientA, studentA, new CreateCorrectionRequest { AssignmentTitle = "Private" });

        var resp = await clientB.DeleteAsync($"/api/students/{studentA}/corrections/{created.Id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task List_OrderedByCreatedAtDesc()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-list-order");

        var first = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "First" });
        await Task.Delay(15);
        var second = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "Second" });
        await Task.Delay(15);
        var third = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "Third" });

        var listResp = await client.GetAsync($"/api/students/{studentId}/corrections");
        var list = (await listResp.Content.ReadFromJsonAsync<List<CorrectionSummaryDto>>())!;
        list.Select(x => x.Id).Should().Equal(third.Id, second.Id, first.Id);
    }

    [Fact]
    public async Task List_StudentNotOwnedByTeacher_Returns404()
    {
        var (clientA, studentA) = await SetupAsync("auth0|corr-list-rls-a", "list-rls-a@example.com");
        var clientB = _factory.CreateAuthenticatedClient("auth0|corr-list-rls-b", "list-rls-b@example.com");

        var resp = await clientB.GetAsync($"/api/students/{studentA}/corrections");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task List_StudentExistsButNoCorrections_ReturnsEmpty200()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-list-empty");

        var resp = await client.GetAsync($"/api/students/{studentId}/corrections");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var list = await resp.Content.ReadFromJsonAsync<List<CorrectionSummaryDto>>();
        list.Should().BeEmpty();
    }

    [Fact]
    public async Task Patch_ClearStudentText_RevertsEntregadaToPendiente()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-revert");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Revert test",
            StudentText = "Texto inicial.",
        });
        created.Status.Should().Be("Entregada");

        var resp = await client.PatchAsJsonAsync(
            $"/api/students/{studentId}/corrections/{created.Id}",
            new UpdateCorrectionRequest { StudentText = "   " });

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>();
        detail!.Status.Should().Be("Pendiente");
        detail.StudentText.Should().BeNull();
    }

    [Fact]
    public async Task Patch_StudentTextOnCorregida_Returns400()
    {
        // Once a correction is Corregida, StudentText is locked (markup tag offsets reference it).
        // We force the status to Corregida directly via the DbContext to keep this test focused
        // on the locked-text rule rather than the corregir generation flow.
        var (client, studentId) = await SetupAsync("auth0|corr-locked-text");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Locked test",
            StudentText = "Original text.",
        });

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LangTeach.Api.Data.AppDbContext>();
            var row = db.Corrections.First(c => c.Id == created.Id);
            row.Status = LangTeach.Api.Data.Models.CorrectionStatus.Corregida;
            row.CorrectedAt = DateTime.UtcNow;
            db.SaveChanges();
        }

        var resp = await client.PatchAsJsonAsync(
            $"/api/students/{studentId}/corrections/{created.Id}",
            new UpdateCorrectionRequest { StudentText = "Edited after correction." });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Corregir_WithAccentedTextAndOffsetDrift_RescuesTagsNotDropped()
    {
        // Simulates the Unicode boundary drift bug (issue #1175): model reports correct
        // spannedText but wrong startIndex/endIndex due to miscounting near é/ó/á chars.
        // The backend rescue in ValidateAndOrderTags must fix the offsets and keep the tag.
        var text = "Ayer él fue al café y después tuvo problemas con las preposiciones también. Él está muy cansado.";
        var (client, studentId) = await SetupAsync("auth0|corr-unicode-rescue");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Unicode rescue test",
            StudentText = text,
        });

        var realIdx = text.IndexOf("café", StringComparison.Ordinal);
        var driftedIdx = realIdx + 2; // simulate +2 byte-offset drift from the accented 'é' in "él"

        _factory.ClaudeStub.Reset();
        _factory.ClaudeStub.EnqueueResponse(BuildDriftedOffsetAiJson(text, "café", driftedIdx));

        var resp = await client.PostAsync(
            $"/api/students/{studentId}/corrections/{created.Id}/corregir",
            content: null);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await WaitForCorrectionStatusAsync(client, studentId, created.Id, "Corregida");
        detail.Tags.Should().HaveCount(1, "tag with correct spannedText must be rescued despite offset drift");
        detail.Tags[0].SpannedText.Should().Be("café");
        detail.Tags[0].StartIndex.Should().Be(realIdx, "rescue must fix startIndex to the true position");
    }

    [Fact]
    public async Task Patch_StudentTextOnCorrigiendo_Returns400()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-locked-corrigiendo");
        var created = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest
        {
            AssignmentTitle = "Corrigiendo lock test",
            StudentText = "Original text.",
        });

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LangTeach.Api.Data.AppDbContext>();
            var row = db.Corrections.First(c => c.Id == created.Id);
            row.Status = LangTeach.Api.Data.Models.CorrectionStatus.Corrigiendo;
            db.SaveChanges();
        }

        var resp = await client.PatchAsJsonAsync(
            $"/api/students/{studentId}/corrections/{created.Id}",
            new UpdateCorrectionRequest { StudentText = "Edited while corrigiendo." });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // --- helpers ---

    [Fact]
    public async Task SubmitFeedback_UpRating_Returns204()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-feedback-up");
        var correction = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "Feedback Up" });

        var resp = await client.PostAsJsonAsync(
            $"/api/students/{studentId}/corrections/{correction.Id}/feedback",
            new { rating = "up" });

        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task SubmitFeedback_DownRatingWithReason_Returns204()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-feedback-down");
        var correction = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "Feedback Down" });

        var resp = await client.PostAsJsonAsync(
            $"/api/students/{studentId}/corrections/{correction.Id}/feedback",
            new { rating = "down", reason = "El tag 3 es léxico, no gramática." });

        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task SubmitFeedback_UnknownCorrectionId_Returns404()
    {
        var (client, _) = await SetupAsync("auth0|corr-feedback-404");
        var fakeStudentId = Guid.NewGuid();
        var fakeCorrectionId = Guid.NewGuid();

        var resp = await client.PostAsJsonAsync(
            $"/api/students/{fakeStudentId}/corrections/{fakeCorrectionId}/feedback",
            new { rating = "up" });

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SubmitFeedback_InvalidRating_Returns400()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-feedback-bad-rating");
        var correction = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "Bad Rating" });

        var resp = await client.PostAsJsonAsync(
            $"/api/students/{studentId}/corrections/{correction.Id}/feedback",
            new { rating = "maybe" });

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SubmitFeedback_DoubleSubmit_IsIdempotent()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-feedback-upsert");
        var correction = await CreateCorrectionAsync(client, studentId, new CreateCorrectionRequest { AssignmentTitle = "Upsert Test" });

        var first = await client.PostAsJsonAsync(
            $"/api/students/{studentId}/corrections/{correction.Id}/feedback",
            new { rating = "up" });
        first.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var second = await client.PostAsJsonAsync(
            $"/api/students/{studentId}/corrections/{correction.Id}/feedback",
            new { rating = "down", reason = "Revised opinion." });
        second.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task SubmitFeedback_OtherTeachersCorrection_Returns404()
    {
        var (clientA, studentA) = await SetupAsync("auth0|corr-feedback-rls-a", "feedback-rls-a@example.com");
        var correction = await CreateCorrectionAsync(clientA, studentA, new CreateCorrectionRequest { AssignmentTitle = "Owner A" });

        var (clientB, _) = await SetupAsync("auth0|corr-feedback-rls-b", "feedback-rls-b@example.com");

        var resp = await clientB.PostAsJsonAsync(
            $"/api/students/{studentA}/corrections/{correction.Id}/feedback",
            new { rating = "up" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Create_WithSourceImageUrl_PersistsBlobUrl()
    {
        var (client, studentId) = await SetupAsync("auth0|corr-source-img");
        const string blobUrl = "https://example.blob.core.windows.net/corrections/123/source.jpg";

        var resp = await client.PostAsJsonAsync(
            $"/api/students/{studentId}/corrections",
            new CreateCorrectionRequest
            {
                AssignmentTitle = "Foto de redacción",
                StudentText = "Texto extraído por OCR.",
                SourceImageUrl = blobUrl,
            });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var detail = await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>();
        detail!.SourceImageUrl.Should().Be(blobUrl);
    }

    private async Task<CorrectionDetailDto> WaitForCorrectionStatusAsync(
        HttpClient client, Guid studentId, Guid correctionId, string expectedStatus,
        int maxWaitMs = 5000, int pollIntervalMs = 50, DateTime? stopWhenUpdatedAtAdvances = null)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(maxWaitMs);
        string? lastStatus = null;
        while (DateTime.UtcNow < deadline)
        {
            var r = await client.GetAsync($"/api/students/{studentId}/corrections/{correctionId}");
            r.EnsureSuccessStatusCode();
            var d = await r.Content.ReadFromJsonAsync<CorrectionDetailDto>();
            lastStatus = d!.Status;
            if (d.Status == expectedStatus) return d;
            if (stopWhenUpdatedAtAdvances.HasValue && d.UpdatedAt > stopWhenUpdatedAtAdvances.Value)
                return d;
            await Task.Delay(pollIntervalMs);
        }
        throw new TimeoutException(
            $"Correction {correctionId} did not reach status '{expectedStatus}' within {maxWaitMs}ms (last seen: '{lastStatus}').");
    }

    private async Task<(HttpClient client, Guid studentId)> SetupAsync(string auth0Id, string? email = null)
    {
        var client = _factory.CreateAuthenticatedClient(auth0Id, email ?? $"{auth0Id.Replace("|", "-")}@example.com");
        var student = await CreateStudentAsync(client);
        return (client, student.Id);
    }

    private static async Task<StudentDto> CreateStudentAsync(HttpClient client)
    {
        var resp = await client.PostAsJsonAsync("/api/students", new CreateStudentRequest
        {
            Name = "Test Student",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
        });
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<StudentDto>())!;
    }

    private static async Task<CorrectionDetailDto> CreateCorrectionAsync(HttpClient client, Guid studentId, CreateCorrectionRequest req)
    {
        var resp = await client.PostAsJsonAsync($"/api/students/{studentId}/corrections", req);
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<CorrectionDetailDto>())!;
    }
}
