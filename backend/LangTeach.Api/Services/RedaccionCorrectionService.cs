using System.Text.Json;
using System.Text.Json.Serialization;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class RedaccionCorrectionService : IRedaccionCorrectionService
{
    private readonly AppDbContext _db;
    private readonly IClaudeClient _claude;
    private readonly RedaccionCorrectionPromptBuilder _promptBuilder;
    private readonly ILogger<RedaccionCorrectionService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };

    public RedaccionCorrectionService(
        AppDbContext db,
        IClaudeClient claude,
        RedaccionCorrectionPromptBuilder promptBuilder,
        ILogger<RedaccionCorrectionService> logger)
    {
        _db = db;
        _claude = claude;
        _promptBuilder = promptBuilder;
        _logger = logger;
    }

    public async Task<CorrectionDetailDto> CorregirAsync(
        Guid teacherId, Guid studentId, Guid correctionId, CancellationToken cancellationToken = default)
    {
        var correction = await _db.Corrections
            .Include(c => c.Tags)
            .FirstOrDefaultAsync(
                c => c.Id == correctionId
                  && c.TeacherId == teacherId
                  && c.StudentId == studentId
                  && c.DeletedAt == null,
                cancellationToken);

        if (correction is null)
            throw new CorrectionNotFoundException();

        if (correction.Status == CorrectionStatus.Pendiente)
            throw new CorrectionInvalidStateException("no_student_text",
                "Cannot correct a redacción before student text is provided.");
        if (correction.Status == CorrectionStatus.Corregida)
            throw new CorrectionInvalidStateException("already_corrected",
                "This redacción has already been corrected.");
        if (correction.Status != CorrectionStatus.Entregada)
            throw new CorrectionInvalidStateException("invalid_status",
                $"Unexpected status: {correction.Status}.");

        // Correction has no Student navigation (AppDbContext configures HasOne<Student>() with no nav).
        // Load the student separately to access CefrLevel / NativeLanguages / Difficulties.
        var student = await _db.Students.FirstOrDefaultAsync(
            s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted, cancellationToken)
            ?? throw new CorrectionNotFoundException();

        var ctx = BuildPromptContext(correction, student);
        var request = _promptBuilder.Build(ctx);

        ClaudeResponse response;
        try
        {
            response = await _claude.CompleteAsync(request, cancellationToken);
        }
        catch (ClaudeRateLimitException ex)
        {
            throw new CorrectionGenerationException("upstream_error", ex.Message, ex);
        }
        catch (ClaudeApiException ex)
        {
            throw new CorrectionGenerationException("upstream_error", ex.Message, ex);
        }

        var raw = response.Content;
        var stripped = ContentJsonHelper.StripFences(raw);
        if (string.IsNullOrWhiteSpace(stripped))
        {
            _logger.LogWarning("Redaccion correction: empty/blank Claude response. CorrectionId={CorrectionId}", correctionId);
            throw new CorrectionGenerationException("invalid_json", "Claude returned empty content.");
        }

        RedaccionCorrectionDto? dto;
        try
        {
            dto = JsonSerializer.Deserialize<RedaccionCorrectionDto>(stripped, JsonOpts);
        }
        catch (JsonException ex)
        {
            var excerpt = stripped.Length > 200 ? stripped[..200] + "..." : stripped;
            _logger.LogWarning(ex, "Redaccion correction: failed to parse JSON. CorrectionId={CorrectionId} Excerpt={Excerpt}",
                correctionId, excerpt);
            throw new CorrectionGenerationException("invalid_json", "Claude response did not parse as the expected JSON shape.", ex);
        }

        if (dto is null || dto.SchemaVersion != 1)
            throw new CorrectionGenerationException("invalid_json", "Claude response is missing or has an unsupported schemaVersion.");

        var sentText = ctx.StudentText;
        if (!string.Equals(dto.OriginalText, sentText, StringComparison.Ordinal))
        {
            _logger.LogWarning(
                "Redaccion correction: originalText mismatch (model paraphrased input). CorrectionId={CorrectionId} SentLen={SentLen} ReturnedLen={ReturnedLen}",
                correctionId, sentText.Length, dto.OriginalText?.Length ?? 0);
            throw new CorrectionGenerationException(
                "original_text_mismatch",
                "Claude returned a paraphrased originalText; tag offsets cannot be trusted.");
        }

        var validatedTags = ValidateAndOrderTags(dto.Tags ?? [], sentText, correctionId);

        var now = DateTime.UtcNow;
        correction.MarkedUpOutput = stripped;
        correction.Status = CorrectionStatus.Corregida;
        correction.CorrectedAt = now;
        correction.UpdatedAt = now;
        correction.SchemaVersion = 1;

        for (var i = 0; i < validatedTags.Count; i++)
        {
            var t = validatedTags[i];
            _db.CorrectionTags.Add(new CorrectionTag
            {
                Id = Guid.NewGuid(),
                CorrectionId = correction.Id,
                Category = t.Category,
                StartIndex = t.StartIndex,
                EndIndex = t.EndIndex,
                SpannedText = t.SpannedText,
                Explanation = t.Explanation,
                CorrectedForm = t.CorrectedForm,
                OrderIndex = i,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Redaccion correction generated. CorrectionId={CorrectionId} TeacherId={TeacherId} StudentId={StudentId} Cefr={Cefr} L1={L1} TagCount={TagCount} ModelTokens={InputTokens}/{OutputTokens}",
            correction.Id, teacherId, studentId, ctx.StudentCefr, ctx.StudentL1 ?? "(none)",
            validatedTags.Count, response.InputTokens, response.OutputTokens);

        // Reload tags through the tracked context so DTO ordering is stable.
        var persistedTags = correction.Tags.OrderBy(t => t.OrderIndex).ToList();
        return ToDetail(correction, persistedTags);
    }

    private static RedaccionCorrectionPromptContext BuildPromptContext(Correction correction, Student student)
    {
        var sanitizedText = correction.StudentText ?? string.Empty;
        var cefr = CefrLevelNormalizer.Normalize(student.CefrLevel);

        var l1 = ParseFirstString(student.NativeLanguages);
        var difficulties = ParseStringArray(student.Difficulties);

        return new RedaccionCorrectionPromptContext(
            StudentText: sanitizedText,
            StudentCefr: cefr,
            StudentL1: l1,
            StudentDifficulties: difficulties,
            AssignmentPrompt: correction.AssignmentPrompt);
    }

    private static string? ParseFirstString(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var first = doc.RootElement[0];
                if (first.ValueKind == JsonValueKind.String)
                {
                    var v = first.GetString();
                    return string.IsNullOrWhiteSpace(v) ? null : v.Trim();
                }
            }
        }
        catch (JsonException) { /* fall through */ }
        return null;
    }

    private static IReadOnlyList<string> ParseStringArray(string json)
    {
        var result = new List<string>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    if (el.ValueKind == JsonValueKind.String)
                    {
                        var v = el.GetString();
                        if (!string.IsNullOrWhiteSpace(v))
                            result.Add(v.Trim());
                    }
                    else if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty("description", out var desc))
                    {
                        // Difficulties may also be stored as objects with a description field.
                        var v = desc.GetString();
                        if (!string.IsNullOrWhiteSpace(v))
                            result.Add(v.Trim());
                    }
                }
            }
        }
        catch (JsonException) { /* fall through */ }
        return result;
    }

    private List<RedaccionCorrectionTagDto> ValidateAndOrderTags(
        IReadOnlyList<RedaccionCorrectionTagDto> rawTags, string originalText, Guid correctionId)
    {
        var kept = new List<RedaccionCorrectionTagDto>(rawTags.Count);
        var len = originalText.Length;

        foreach (var tag in rawTags)
        {
            if (string.IsNullOrEmpty(tag.Category) || !CorrectionTagCategory.IsValid(tag.Category))
            {
                _logger.LogWarning("Drop tag: invalid category '{Category}'. CorrectionId={CorrectionId}", tag.Category, correctionId);
                continue;
            }
            if (tag.StartIndex < 0 || tag.EndIndex <= tag.StartIndex || tag.EndIndex > len)
            {
                _logger.LogWarning(
                    "Drop tag: bad offsets [{Start},{End}) against text length {Len}. CorrectionId={CorrectionId}",
                    tag.StartIndex, tag.EndIndex, len, correctionId);
                continue;
            }
            var actualSpan = originalText.Substring(tag.StartIndex, tag.EndIndex - tag.StartIndex);
            if (!string.Equals(actualSpan, tag.SpannedText, StringComparison.Ordinal))
            {
                _logger.LogWarning(
                    "Drop tag: spannedText '{Sent}' does not match originalText[{Start},{End}) = '{Actual}'. CorrectionId={CorrectionId}",
                    tag.SpannedText, tag.StartIndex, tag.EndIndex, actualSpan, correctionId);
                continue;
            }

            string? explanation = tag.Explanation;
            string? correctedForm = tag.CorrectedForm;

            if (tag.Category == CorrectionTagCategory.MuyBien)
            {
                if (!string.IsNullOrWhiteSpace(explanation) || !string.IsNullOrWhiteSpace(correctedForm))
                {
                    _logger.LogWarning(
                        "MuyBien tag had non-null explanation/correctedForm; coercing to null. CorrectionId={CorrectionId}",
                        correctionId);
                }
                explanation = null;
                correctedForm = null;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(explanation) || string.IsNullOrWhiteSpace(correctedForm))
                {
                    _logger.LogWarning(
                        "Drop tag: category {Category} requires non-empty explanation and correctedForm. CorrectionId={CorrectionId}",
                        tag.Category, correctionId);
                    continue;
                }
            }

            kept.Add(tag with { Explanation = explanation, CorrectedForm = correctedForm });
        }

        kept.Sort((a, b) => a.StartIndex.CompareTo(b.StartIndex));

        var nonOverlapping = new List<RedaccionCorrectionTagDto>(kept.Count);
        var lastEnd = 0;
        foreach (var tag in kept)
        {
            if (tag.StartIndex < lastEnd)
            {
                _logger.LogWarning(
                    "Drop tag: overlaps prior tag (start {Start} < lastEnd {LastEnd}). CorrectionId={CorrectionId}",
                    tag.StartIndex, lastEnd, correctionId);
                continue;
            }
            nonOverlapping.Add(tag);
            lastEnd = tag.EndIndex;
        }

        return nonOverlapping;
    }

    private static CorrectionDetailDto ToDetail(Correction c, IEnumerable<CorrectionTag> tags) =>
        new(
            c.Id,
            c.StudentId,
            c.SchemaVersion,
            c.Status,
            c.AssignmentTitle,
            c.AssignmentPrompt,
            c.StudentText,
            c.MarkedUpOutput,
            tags.OrderBy(t => t.OrderIndex)
                .Select(t => new CorrectionTagDto(t.Category, t.SpannedText, t.StartIndex, t.EndIndex, t.Explanation, t.CorrectedForm, t.OrderIndex))
                .ToList(),
            c.CreatedAt,
            c.UpdatedAt,
            c.CorrectedAt);

    // Internal DTO mirroring redaccion-correction.schema.json. Exposed as a record so tests
    // can construct fixture payloads against the same shape the production code parses.
    public record RedaccionCorrectionDto(
        [property: JsonPropertyName("schemaVersion")] int SchemaVersion,
        [property: JsonPropertyName("originalText")] string OriginalText,
        [property: JsonPropertyName("tags")] IReadOnlyList<RedaccionCorrectionTagDto>? Tags);

    public record RedaccionCorrectionTagDto(
        [property: JsonPropertyName("category")] string Category,
        [property: JsonPropertyName("startIndex")] int StartIndex,
        [property: JsonPropertyName("endIndex")] int EndIndex,
        [property: JsonPropertyName("spannedText")] string SpannedText,
        [property: JsonPropertyName("explanation")] string? Explanation,
        [property: JsonPropertyName("correctedForm")] string? CorrectedForm);
}
