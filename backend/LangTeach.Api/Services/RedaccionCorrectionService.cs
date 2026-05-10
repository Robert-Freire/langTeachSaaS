using System.Text.Json;
using System.Text.Json.Serialization;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Services;

public class RedaccionCorrectionService : IRedaccionCorrectionService
{
    private readonly AppDbContext _db;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly RedaccionCorrectionPromptBuilder _promptBuilder;
    private readonly ILogger<RedaccionCorrectionService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };

    public RedaccionCorrectionService(
        AppDbContext db,
        IServiceScopeFactory scopeFactory,
        RedaccionCorrectionPromptBuilder promptBuilder,
        ILogger<RedaccionCorrectionService> logger)
    {
        _db = db;
        _scopeFactory = scopeFactory;
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
        if (correction.Status == CorrectionStatus.Corrigiendo)
            return CorrectionDtoMapper.ToDetail(correction, correction.Tags);
        if (correction.Status == CorrectionStatus.Corregida)
            throw new CorrectionInvalidStateException("already_corrected",
                "This redacción has already been corrected.");
        if (correction.Status != CorrectionStatus.Entregada)
            throw new CorrectionInvalidStateException("invalid_status",
                $"Unexpected status: {correction.Status}.");

        correction.Status = CorrectionStatus.Corrigiendo;
        correction.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var outerLogger = _logger;
        _ = Task.Run(async () =>
        {
            ILogger<RedaccionCorrectionService>? scopeLogger = null;
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var sp = scope.ServiceProvider;
                var db = sp.GetRequiredService<AppDbContext>();
                var claude = sp.GetRequiredService<IClaudeClient>();
                var promptBuilder = sp.GetRequiredService<RedaccionCorrectionPromptBuilder>();
                var filterPromptBuilder = sp.GetRequiredService<RedaccionLevelFilterPromptBuilder>();
                scopeLogger = sp.GetRequiredService<ILogger<RedaccionCorrectionService>>();
                await RunCorrectionInScopeAsync(correctionId, studentId, teacherId, db, claude, promptBuilder, filterPromptBuilder, scopeLogger);
            }
            catch (Exception ex)
            {
                (scopeLogger ?? outerLogger).LogError(ex,
                    "Background correction failed silently; row stays Corrigiendo until CorrectionService.ListAsync staleness sweep resets it to Entregada. CorrectionId={CorrectionId} TeacherId={TeacherId} StudentId={StudentId}",
                    correctionId, teacherId, studentId);
            }
        });

        return CorrectionDtoMapper.ToDetail(correction, correction.Tags);
    }

    private static async Task RunCorrectionInScopeAsync(
        Guid correctionId, Guid studentId, Guid teacherId,
        AppDbContext db, IClaudeClient claude,
        RedaccionCorrectionPromptBuilder promptBuilder,
        RedaccionLevelFilterPromptBuilder filterPromptBuilder,
        ILogger logger)
    {
        var correction = await db.Corrections
            .Include(c => c.Tags)
            .FirstOrDefaultAsync(c => c.Id == correctionId && c.DeletedAt == null);

        if (correction is null)
        {
            logger.LogWarning(
                "Background correction: record not found. CorrectionId={CorrectionId}", correctionId);
            return;
        }

        if (correction.Status != CorrectionStatus.Corrigiendo)
        {
            logger.LogWarning(
                "Background correction: unexpected status {Status} (expected Corrigiendo). CorrectionId={CorrectionId}",
                correction.Status, correctionId);
            return;
        }

        var student = await db.Students.FirstOrDefaultAsync(
            s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted);

        if (student is null)
        {
            logger.LogWarning(
                "Background correction: student not found. CorrectionId={CorrectionId} StudentId={StudentId}",
                correctionId, studentId);
            return;
        }

        var ctx = BuildPromptContext(correction, student);
        var request = promptBuilder.Build(ctx);
        var sentText = ctx.StudentText.TrimEnd();

        const int MaxAttempts = 2;
        ClaudeResponse response = null!;
        string? stripped = null;
        RedaccionCorrectionDto dto = null!;
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            response = await claude.CompleteAsync(request, CancellationToken.None);

            var raw = response.Content;
            stripped = ContentJsonHelper.StripFences(raw);
            if (string.IsNullOrWhiteSpace(stripped))
            {
                logger.LogWarning("Background correction: empty/blank Claude response. CorrectionId={CorrectionId}", correctionId);
                throw new InvalidOperationException("Claude returned empty content.");
            }

            RedaccionCorrectionDto? parsed;
            try
            {
                parsed = JsonSerializer.Deserialize<RedaccionCorrectionDto>(stripped, JsonOpts);
            }
            catch (JsonException ex)
            {
                var excerpt = stripped.Length > 200 ? stripped[..200] + "..." : stripped;
                logger.LogWarning(ex, "Background correction: failed to parse JSON. CorrectionId={CorrectionId} Excerpt={Excerpt}",
                    correctionId, excerpt);
                throw new InvalidOperationException("Claude response did not parse as the expected JSON shape.", ex);
            }

            if (parsed is null || parsed.SchemaVersion != 1)
                throw new InvalidOperationException("Claude response is missing or has an unsupported schemaVersion.");

            if (string.Equals(parsed.OriginalText, sentText, StringComparison.Ordinal))
            {
                dto = parsed;
                break;
            }

            if (attempt < MaxAttempts)
            {
                logger.LogWarning(
                    "Background correction: originalText mismatch on attempt {Attempt}/{MaxAttempts}; retrying once. CorrectionId={CorrectionId} SentLen={SentLen} ReturnedLen={ReturnedLen}",
                    attempt, MaxAttempts, correctionId, sentText.Length, parsed.OriginalText?.Length ?? 0);
                continue;
            }

            logger.LogWarning(
                "Background correction: originalText mismatch after {MaxAttempts} attempts. CorrectionId={CorrectionId} SentLen={SentLen} ReturnedLen={ReturnedLen}",
                MaxAttempts, correctionId, sentText.Length, parsed.OriginalText?.Length ?? 0);
            throw new InvalidOperationException("Claude returned a paraphrased originalText; tag offsets cannot be trusted.");
        }

        var validatedTags = ValidateAndOrderTags(dto.Tags ?? [], sentText, correctionId, logger);

        // TOCTOU guard: check before the filter call so a concurrent completion aborts early
        // without firing an unnecessary Haiku round-trip.
        var freshStatus = await db.Corrections
            .AsNoTracking()
            .Where(c => c.Id == correctionId)
            .Select(c => c.Status)
            .FirstOrDefaultAsync();
        if (freshStatus != CorrectionStatus.Corrigiendo)
        {
            logger.LogWarning(
                "Background correction: status changed to {Status} during Pass 1; discarding. CorrectionId={CorrectionId}",
                freshStatus, correctionId);
            return;
        }

        var filteredTags = await ApplyLevelFilterAsync(
            validatedTags, ctx.StudentCefr, claude, filterPromptBuilder, correctionId, logger);

        var now = DateTime.UtcNow;
        correction.MarkedUpOutput = stripped!;
        correction.Status = CorrectionStatus.Corregida;
        correction.CorrectedAt = now;
        correction.UpdatedAt = now;
        correction.SchemaVersion = 1;

        for (var i = 0; i < filteredTags.Count; i++)
        {
            var t = filteredTags[i];
            db.CorrectionTags.Add(new CorrectionTag
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

        await db.SaveChangesAsync(CancellationToken.None);

        logger.LogInformation(
            "Background correction completed. CorrectionId={CorrectionId} TeacherId={TeacherId} StudentId={StudentId} Cefr={Cefr} L1={L1} TagCount={TagCount} FilteredOut={FilteredOut} ModelTokens={InputTokens}/{OutputTokens}",
            correctionId, teacherId, studentId, ctx.StudentCefr, ctx.StudentL1 ?? "(none)",
            filteredTags.Count, validatedTags.Count - filteredTags.Count, response.InputTokens, response.OutputTokens);
    }

    private static RedaccionCorrectionPromptContext BuildPromptContext(Correction correction, Student student)
    {
        // StudentText is preserved verbatim (no InputSanitizer call): tag offsets must
        // address the same string the model echoes back as originalText. Sanitization
        // happens at write time on POST /corrections (DTO layer); we trust what's in DB.
        //
        // The trim-trailing-whitespace concern (the model treats the text as ending at the
        // last non-whitespace character when wrapped in markers and does NOT echo the
        // trailing newline back) is handled at the equality-check site in RunCorrectionInScopeAsync,
        // not here, so the persisted Correction.StudentText stays exactly what the student wrote.
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

    private static List<RedaccionCorrectionTagDto> ValidateAndOrderTags(
        IReadOnlyList<RedaccionCorrectionTagDto> rawTags, string originalText, Guid correctionId, ILogger logger)
    {
        var kept = new List<RedaccionCorrectionTagDto>(rawTags.Count);
        var len = originalText.Length;

        foreach (var rawTag in rawTags)
        {
            var tag = rawTag;
            if (string.IsNullOrEmpty(tag.Category) || !CorrectionTagCategory.IsValid(tag.Category))
            {
                logger.LogWarning("Drop tag: invalid category '{Category}'. CorrectionId={CorrectionId}", tag.Category, correctionId);
                continue;
            }
            if (tag.StartIndex < 0 || tag.EndIndex <= tag.StartIndex || tag.EndIndex > len)
            {
                logger.LogWarning(
                    "Drop tag: bad offsets [{Start},{End}) against text length {Len}. CorrectionId={CorrectionId}",
                    tag.StartIndex, tag.EndIndex, len, correctionId);
                continue;
            }
            var actualSpan = originalText.Substring(tag.StartIndex, tag.EndIndex - tag.StartIndex);
            if (!string.Equals(actualSpan, tag.SpannedText, StringComparison.Ordinal))
            {
                if (string.IsNullOrEmpty(tag.SpannedText))
                {
                    logger.LogWarning(
                        "Drop tag: spannedText is null or empty. CorrectionId={CorrectionId}", correctionId);
                    continue;
                }
                var foundAt = originalText.IndexOf(tag.SpannedText, StringComparison.Ordinal);
                if (foundAt < 0)
                {
                    logger.LogWarning(
                        "Drop tag: spannedText '{Spanned}' not found in originalText (model hallucinated span). CorrectionId={CorrectionId}",
                        tag.SpannedText, correctionId);
                    continue;
                }
                var secondAt = originalText.IndexOf(tag.SpannedText, foundAt + 1, StringComparison.Ordinal);
                if (secondAt >= 0)
                {
                    logger.LogWarning(
                        "Drop tag: spannedText '{Spanned}' is ambiguous (found at {First} and {Second}); cannot rescue. CorrectionId={CorrectionId}",
                        tag.SpannedText, foundAt, secondAt, correctionId);
                    continue;
                }
                logger.LogWarning(
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
                    logger.LogWarning(
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
                    logger.LogWarning(
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
                logger.LogWarning(
                    "Drop tag: overlaps prior tag (start {Start} < lastEnd {LastEnd}). CorrectionId={CorrectionId}",
                    tag.StartIndex, lastEnd, correctionId);
                continue;
            }
            nonOverlapping.Add(tag);
            lastEnd = tag.EndIndex;
        }

        return nonOverlapping;
    }

    private static async Task<IReadOnlyList<RedaccionCorrectionTagDto>> ApplyLevelFilterAsync(
        IReadOnlyList<RedaccionCorrectionTagDto> tags,
        string cefr,
        IClaudeClient claude,
        RedaccionLevelFilterPromptBuilder filterBuilder,
        Guid correctionId,
        ILogger logger)
    {
        if (tags.Count == 0)
            return tags;

        var inputs = tags
            .Select(t => new LevelFilterTagInput(t.Category, t.SpannedText, t.Explanation))
            .ToList();

        ClaudeResponse filterResponse;
        try
        {
            var filterRequest = filterBuilder.Build(cefr, inputs);
            filterResponse = await claude.CompleteAsync(filterRequest, CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Level filter call failed; keeping all validated tags. CorrectionId={CorrectionId}", correctionId);
            return tags;
        }

        List<FilterDecision>? decisions;
        try
        {
            var raw = ContentJsonHelper.StripFences(filterResponse.Content);
            decisions = JsonSerializer.Deserialize<List<FilterDecision>>(raw ?? string.Empty, JsonOpts);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Level filter response did not parse; keeping all validated tags. CorrectionId={CorrectionId}", correctionId);
            return tags;
        }

        if (decisions is null)
        {
            logger.LogWarning(
                "Level filter returned null; keeping all validated tags. CorrectionId={CorrectionId}", correctionId);
            return tags;
        }

        var decisionMap = new Dictionary<int, FilterDecision>(decisions.Count);
        foreach (var d in decisions)
        {
            if (d.Index >= 0 && d.Index < tags.Count)
                decisionMap[d.Index] = d;
        }

        var result = new List<RedaccionCorrectionTagDto>(tags.Count);
        for (var i = 0; i < tags.Count; i++)
        {
            var tag = tags[i];

            // O and MuyBien tags always pass through regardless of filter decision.
            if (tag.Category == CorrectionTagCategory.Ortografia || tag.Category == CorrectionTagCategory.MuyBien)
            {
                result.Add(tag);
                continue;
            }

            if (!decisionMap.TryGetValue(i, out var decision))
            {
                // Filter omitted this tag; fall open (keep).
                result.Add(tag);
                continue;
            }

            switch (decision.Decision?.ToLowerInvariant())
            {
                case "keep":
                    result.Add(tag);
                    break;
                case "soften":
                    // Convert to MuyBien: highlights the attempt without penalising the student.
                    // decision.Note (the warm Spanish acknowledgement) is not persisted to DB in
                    // this version; CorrectionTag has no note column. Pending schema enhancement.
                    result.Add(tag with
                    {
                        Category = CorrectionTagCategory.MuyBien,
                        Explanation = null,
                        CorrectedForm = null,
                    });
                    break;
                case "remove":
                    logger.LogDebug(
                        "Level filter removed above-level tag [{Category}] \"{Span}\". CorrectionId={CorrectionId}",
                        tag.Category, tag.SpannedText, correctionId);
                    break;
                default:
                    // Unknown decision; keep.
                    result.Add(tag);
                    break;
            }
        }

        return result;
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

    private record FilterDecision(
        [property: JsonPropertyName("index")] int Index,
        [property: JsonPropertyName("decision")] string Decision,
        [property: JsonPropertyName("note")] string? Note);
}
