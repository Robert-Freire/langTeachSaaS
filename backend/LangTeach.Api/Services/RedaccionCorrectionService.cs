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
        // The model treats the text inside the STUDENT_TEXT_VERBATIM markers as ending at the
        // last non-whitespace character and does NOT echo the trailing newline (the marker on
        // the next line is its own token boundary). The strict ordinal check therefore compares
        // against the trim-end-ed version, NOT against ctx.StudentText raw - otherwise a
        // student submission ending with whitespace produces a false mismatch every time.
        // ctx.StudentText itself stays raw, and the persisted Correction.StudentText (what the
        // student wrote) is never modified.
        var sentText = ctx.StudentText.TrimEnd();

        // One-shot retry on originalText mismatch only. Sonnet 4.6 occasionally paraphrases
        // longer inputs even with temperature=0 + delimited markers; a second attempt almost
        // always succeeds. Other failure codes (invalid_json, upstream_error) propagate
        // immediately - they are not transient and retrying wastes a round-trip.
        const int MaxAttempts = 2;
        ClaudeResponse response = null!;
        string? stripped = null;
        RedaccionCorrectionDto dto = null!;
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                response = await _claude.CompleteAsync(request, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                // Caller-driven cancellation flows up unchanged.
                throw;
            }
            catch (ClaudeRateLimitException ex)
            {
                throw new CorrectionGenerationException("upstream_error", ex.Message, ex);
            }
            catch (ClaudeApiException ex)
            {
                throw new CorrectionGenerationException("upstream_error", ex.Message, ex);
            }
            catch (Exception ex)
            {
                // Any other transport / parsing / serialization failure from the Claude
                // client maps to upstream_error so the controller returns 502 (consistent
                // with the existing two specific catches), not an unhandled 500.
                throw new CorrectionGenerationException("upstream_error", ex.Message, ex);
            }

            var raw = response.Content;
            stripped = ContentJsonHelper.StripFences(raw);
            if (string.IsNullOrWhiteSpace(stripped))
            {
                _logger.LogWarning("Redaccion correction: empty/blank Claude response. CorrectionId={CorrectionId}", correctionId);
                throw new CorrectionGenerationException("invalid_json", "Claude returned empty content.");
            }

            RedaccionCorrectionDto? parsed;
            try
            {
                parsed = JsonSerializer.Deserialize<RedaccionCorrectionDto>(stripped, JsonOpts);
            }
            catch (JsonException ex)
            {
                var excerpt = stripped.Length > 200 ? stripped[..200] + "..." : stripped;
                _logger.LogWarning(ex, "Redaccion correction: failed to parse JSON. CorrectionId={CorrectionId} Excerpt={Excerpt}",
                    correctionId, excerpt);
                throw new CorrectionGenerationException("invalid_json", "Claude response did not parse as the expected JSON shape.", ex);
            }

            if (parsed is null || parsed.SchemaVersion != 1)
                throw new CorrectionGenerationException("invalid_json", "Claude response is missing or has an unsupported schemaVersion.");

            if (string.Equals(parsed.OriginalText, sentText, StringComparison.Ordinal))
            {
                dto = parsed;
                break;
            }

            if (attempt < MaxAttempts)
            {
                _logger.LogWarning(
                    "Redaccion correction: originalText mismatch on attempt {Attempt}/{MaxAttempts}; retrying once. CorrectionId={CorrectionId} SentLen={SentLen} ReturnedLen={ReturnedLen}",
                    attempt, MaxAttempts, correctionId, sentText.Length, parsed.OriginalText?.Length ?? 0);
                continue;
            }

            _logger.LogWarning(
                "Redaccion correction: originalText mismatch after {MaxAttempts} attempts (model paraphrased input). CorrectionId={CorrectionId} SentLen={SentLen} ReturnedLen={ReturnedLen}",
                MaxAttempts, correctionId, sentText.Length, parsed.OriginalText?.Length ?? 0);
            throw new CorrectionGenerationException(
                "original_text_mismatch",
                "Claude returned a paraphrased originalText; tag offsets cannot be trusted.");
        }

        var validatedTags = ValidateAndOrderTags(dto.Tags ?? [], sentText, correctionId);

        // TOCTOU guard: a concurrent /corregir call could have completed during our Claude
        // round-trip. Re-check the persisted status before writing tags to avoid duplicate
        // tag rows (last-write-wins on the parent row is acceptable; duplicate child rows
        // are not). True atomicity requires a Corrigiendo state + DB-level claim, which
        // needs a migration; deferred to a follow-up. See plan/code-review-backlog.md.
        var freshStatus = await _db.Corrections
            .AsNoTracking()
            .Where(c => c.Id == correctionId)
            .Select(c => c.Status)
            .FirstOrDefaultAsync(cancellationToken);
        if (freshStatus != CorrectionStatus.Entregada)
        {
            _logger.LogWarning(
                "Redaccion correction: another request completed first (status now {Status}). Discarding this run. CorrectionId={CorrectionId}",
                freshStatus, correctionId);
            throw new CorrectionInvalidStateException("already_corrected",
                "Another request completed this correction concurrently.");
        }

        var now = DateTime.UtcNow;
        correction.MarkedUpOutput = stripped!;
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
        return CorrectionDtoMapper.ToDetail(correction, persistedTags);
    }

    private static RedaccionCorrectionPromptContext BuildPromptContext(Correction correction, Student student)
    {
        // StudentText is preserved verbatim (no InputSanitizer call): tag offsets must
        // address the same string the model echoes back as originalText. Sanitization
        // happens at write time on POST /corrections (DTO layer); we trust what's in DB.
        //
        // The trim-trailing-whitespace concern (the model treats the text as ending at the
        // last non-whitespace character when wrapped in markers and does NOT echo the
        // trailing newline back) is handled at the equality-check site in CorregirAsync, not
        // here, so the persisted Correction.StudentText stays exactly what the student wrote.
        var studentText = correction.StudentText ?? string.Empty;
        var cefr = CefrLevelNormalizer.Normalize(student.CefrLevel);

        var l1 = ParseFirstString(student.NativeLanguages);
        var difficulties = ParseStringArray(student.Difficulties);

        return new RedaccionCorrectionPromptContext(
            StudentText: studentText,
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

        foreach (var rawTag in rawTags)
        {
            var tag = rawTag;
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
                if (string.IsNullOrEmpty(tag.SpannedText))
                {
                    _logger.LogWarning(
                        "Drop tag: spannedText is null or empty. CorrectionId={CorrectionId}", correctionId);
                    continue;
                }
                // Rescue: the model reported valid-range offsets but the substring doesn't match.
                // This is the Unicode boundary drift pattern (model miscounts chars near é/ó/á/ñ).
                // Locate spannedText by string search; fix offsets if the match is unambiguous.
                var foundAt = originalText.IndexOf(tag.SpannedText, StringComparison.Ordinal);
                if (foundAt < 0)
                {
                    _logger.LogWarning(
                        "Drop tag: spannedText '{Spanned}' not found in originalText (model hallucinated span). CorrectionId={CorrectionId}",
                        tag.SpannedText, correctionId);
                    continue;
                }
                var secondAt = originalText.IndexOf(tag.SpannedText, foundAt + 1, StringComparison.Ordinal);
                if (secondAt >= 0)
                {
                    _logger.LogWarning(
                        "Drop tag: spannedText '{Spanned}' is ambiguous (found at {First} and {Second}); cannot rescue. CorrectionId={CorrectionId}",
                        tag.SpannedText, foundAt, secondAt, correctionId);
                    continue;
                }
                _logger.LogWarning(
                    "Rescue tag: Unicode offset drift; spannedText '{Spanned}' relocated from model-reported [{Start},{End}) to [{Fixed},{FixedEnd}). CorrectionId={CorrectionId}",
                    tag.SpannedText, tag.StartIndex, tag.EndIndex, foundAt, foundAt + tag.SpannedText.Length, correctionId);
                tag = tag with { StartIndex = foundAt, EndIndex = foundAt + tag.SpannedText.Length };
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
