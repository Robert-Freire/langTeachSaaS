using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
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
    private readonly ILogger<RedaccionCorrectionService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };

    public RedaccionCorrectionService(
        AppDbContext db,
        IServiceScopeFactory scopeFactory,
        ILogger<RedaccionCorrectionService> logger)
    {
        _db = db;
        _scopeFactory = scopeFactory;
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
                  && !c.IsDeleted,
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
        if (correction.Status is not CorrectionStatus.Entregada and not CorrectionStatus.CorreccionFallida)
            throw new CorrectionInvalidStateException("invalid_status",
                $"Unexpected status: {correction.Status}.");

        correction.Status = CorrectionStatus.Corrigiendo;
        correction.UpdatedAt = DateTime.UtcNow;
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Another concurrent request won the race and already set Corrigiendo (or later).
            // Re-query with Include so Tags are also fresh (ReloadAsync only refreshes scalars).
            correction = await _db.Corrections
                .Include(c => c.Tags)
                .FirstAsync(c => c.Id == correctionId, cancellationToken);
            return CorrectionDtoMapper.ToDetail(correction, correction.Tags);
        }

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
                var correctionPromptService = sp.GetRequiredService<ICorrectionPromptService>();
                scopeLogger = sp.GetRequiredService<ILogger<RedaccionCorrectionService>>();
                await RunCorrectionInScopeAsync(correctionId, studentId, teacherId, db, claude, correctionPromptService, scopeLogger);
            }
            catch (ClaudeRateLimitException rle)
            {
                var errLogger = scopeLogger ?? outerLogger;
                errLogger.LogWarning(
                    "Background correction: Claude rate limit hit; reverting to Entregada for retry. CorrectionId={CorrectionId} TeacherId={TeacherId} RetryAfter={RetryAfter}",
                    correctionId, teacherId, rle.RetryAfter);
                try
                {
                    using var failScope = _scopeFactory.CreateScope();
                    var failDb = failScope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var failRow = await failDb.Corrections
                        .FirstOrDefaultAsync(c => c.Id == correctionId && !c.IsDeleted);
                    if (failRow is not null && failRow.Status == CorrectionStatus.Corrigiendo)
                    {
                        failRow.Status = CorrectionStatus.Entregada;
                        failRow.UpdatedAt = DateTime.UtcNow;
                        // No DbUpdateConcurrencyException guard here: if a race occurs the outer
                        // catch (Exception saveEx) logs it, and CorrectionStaleRecoveryService
                        // will reset the row on the next timer tick.
                        await failDb.SaveChangesAsync();
                    }
                }
                catch (Exception saveEx)
                {
                    errLogger.LogError(saveEx,
                        "Failed to revert status to Entregada after Claude rate limit. CorrectionId={CorrectionId}", correctionId);
                }
            }
            catch (Exception ex)
            {
                var errLogger = scopeLogger ?? outerLogger;
                errLogger.LogError(ex,
                    "Background correction failed; setting CorreccionFallida. CorrectionId={CorrectionId} TeacherId={TeacherId} StudentId={StudentId}",
                    correctionId, teacherId, studentId);
                try
                {
                    using var failScope = _scopeFactory.CreateScope();
                    var failDb = failScope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var failRow = await failDb.Corrections
                        .FirstOrDefaultAsync(c => c.Id == correctionId && !c.IsDeleted);
                    if (failRow is not null && failRow.Status == CorrectionStatus.Corrigiendo)
                    {
                        failRow.Status = CorrectionStatus.CorreccionFallida;
                        failRow.UpdatedAt = DateTime.UtcNow;
                        // No DbUpdateConcurrencyException guard here: outer catch logs it,
                        // and CorrectionStaleRecoveryService resets the row on the next tick.
                        await failDb.SaveChangesAsync();
                    }
                }
                catch (Exception saveEx)
                {
                    errLogger.LogError(saveEx,
                        "Failed to persist CorreccionFallida status. CorrectionId={CorrectionId}", correctionId);
                }
            }
        });

        return CorrectionDtoMapper.ToDetail(correction, correction.Tags);
    }

    private static async Task RunCorrectionInScopeAsync(
        Guid correctionId, Guid studentId, Guid teacherId,
        AppDbContext db, IClaudeClient claude,
        ICorrectionPromptService correctionPromptService,
        ILogger logger)
    {
        var correction = await db.Corrections
            .Include(c => c.Tags)
            .FirstOrDefaultAsync(c => c.Id == correctionId && !c.IsDeleted);

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

        var cefr = CefrLevelNormalizer.Normalize(student.CefrLevel);
        var ctx = BuildPromptContext(correction, student);
        var request = correctionPromptService.BuildCorrectionPrompt(ctx) with { CallSite = "correction.pass1", CorrelationId = correctionId };
        var sentText = ctx.StudentText.TrimEnd();

        var response = await claude.CompleteAsync(request, CancellationToken.None);

        var raw = response.Content;
        var stripped = ContentJsonHelper.StripFencesAndPreamble(raw);
        if (string.IsNullOrWhiteSpace(stripped))
        {
            logger.LogWarning("Background correction: empty/blank Claude response. CorrectionId={CorrectionId}", correctionId);
            throw new InvalidOperationException("Claude returned empty content.");
        }

        RedaccionCorrectionDto dto;
        try
        {
            var parsed = JsonSerializer.Deserialize<RedaccionCorrectionDto>(stripped, JsonOpts);
            if (parsed is null || parsed.SchemaVersion != 1)
                throw new InvalidOperationException("Claude response is missing or has an unsupported schemaVersion.");
            dto = parsed;
        }
        catch (JsonException ex)
        {
            var excerpt = stripped.Length > 200 ? stripped[..200] + "..." : stripped;
            logger.LogWarning(ex, "Background correction: failed to parse JSON. CorrectionId={CorrectionId} Excerpt={Excerpt}",
                correctionId, excerpt);
            throw new InvalidOperationException("Claude response did not parse as the expected JSON shape.", ex);
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
            validatedTags, cefr, ctx.AssignmentPrompt, claude, correctionPromptService, correctionId, logger);

        var affirmerTags = await RunScopeAffirmerAsync(
            filteredTags, cefr, sentText, claude, correctionPromptService, correctionId, logger);

        var mergedTags = MergeAndDedupWithAffirmer(filteredTags, affirmerTags, correctionId, logger);

        var now = DateTime.UtcNow;
        correction.MarkedUpOutput = stripped!;
        correction.Status = CorrectionStatus.Corregida;
        correction.CorrectedAt = now;
        correction.UpdatedAt = now;
        correction.SchemaVersion = 1;

        for (var i = 0; i < mergedTags.Count; i++)
        {
            var t = mergedTags[i];
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
            "Background correction completed. CorrectionId={CorrectionId} TeacherId={TeacherId} StudentId={StudentId} Cefr={Cefr} L1={L1} TagCount={TagCount} FilteredOut={FilteredOut} AffirmerAdded={AffirmerAdded} ModelTokens={InputTokens}/{OutputTokens}",
            correctionId, teacherId, studentId, cefr, ctx.StudentL1 ?? "(none)",
            mergedTags.Count, validatedTags.Count - filteredTags.Count, affirmerTags.Count,
            response.InputTokens, response.OutputTokens);
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
        var l1 = ParseFirstString(student.NativeLanguages);
        var difficulties = ParseStringArray(student.Difficulties);

        return new RedaccionCorrectionPromptContext(
            StudentText: studentText,
            StudentL1: l1,
            StudentDifficulties: difficulties,
            AssignmentPrompt: InputSanitizer.Sanitize(correction.AssignmentPrompt));
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

                // Try contextBefore + spannedText for unambiguous rescue (avoids proximity
                // heuristic failures when a common word like "es" appears many times).
                int? contextFoundAt = null;
                if (!string.IsNullOrEmpty(tag.ContextBefore))
                {
                    var combined = tag.ContextBefore + tag.SpannedText;
                    var combinedHits = new List<int>();
                    var cf = 0;
                    while (true)
                    {
                        var hit = originalText.IndexOf(combined, cf, StringComparison.Ordinal);
                        if (hit < 0) break;
                        combinedHits.Add(hit + tag.ContextBefore.Length);
                        cf = hit + 1;
                    }
                    if (combinedHits.Count == 1)
                        contextFoundAt = combinedHits[0];
                }

                if (contextFoundAt.HasValue)
                {
                    tag = tag with { StartIndex = contextFoundAt.Value, EndIndex = contextFoundAt.Value + tag.SpannedText.Length };
                }
                else
                {
                    // Fall back to proximity-based rescue.
                    var occurrences = new List<int>();
                    var searchFrom = 0;
                    while (true)
                    {
                        var hit = originalText.IndexOf(tag.SpannedText, searchFrom, StringComparison.Ordinal);
                        if (hit < 0) break;
                        occurrences.Add(hit);
                        searchFrom = hit + 1;
                    }
                    if (occurrences.Count == 0)
                    {
                        logger.LogWarning(
                            "Drop tag: spannedText '{Spanned}' not found in originalText (model hallucinated span). CorrectionId={CorrectionId}",
                            tag.SpannedText, correctionId);
                        continue;
                    }
                    // When there are multiple occurrences, use the model's startIndex as a proximity hint:
                    // the model knows approximately where the error is even if the exact offset drifted due
                    // to accented characters. Pick the occurrence closest to the reported startIndex.
                    // On a tie (two occurrences equidistant), MinBy returns the earlier one (stable).
                    var foundAt = occurrences.Count == 1
                        ? occurrences[0]
                        : occurrences.MinBy(p => Math.Abs(p - tag.StartIndex));
                    if (occurrences.Count > 1)
                    {
                        logger.LogWarning(
                            "Rescue tag: '{Spanned}' found {N} times; chose position {Chosen} nearest model-reported {Reported}. CorrectionId={CorrectionId}",
                            tag.SpannedText, occurrences.Count, foundAt, tag.StartIndex, correctionId);
                    }
                    logger.LogWarning(
                        "Rescue tag: Unicode offset drift; spannedText '{Spanned}' relocated from model-reported [{Start},{End}) to [{Fixed},{FixedEnd}). CorrectionId={CorrectionId}",
                        tag.SpannedText, tag.StartIndex, tag.EndIndex, foundAt, foundAt + tag.SpannedText.Length, correctionId);
                    tag = tag with { StartIndex = foundAt, EndIndex = foundAt + tag.SpannedText.Length };
                }
            }

            // MuyBien is produced by the level filter or ScopeAffirmer -- never by Pass 1.
            // Drop any MuyBien that the model hallucinated in Pass 1.
            if (tag.Category == CorrectionTagCategory.MuyBien)
            {
                logger.LogWarning(
                    "Drop tag: MuyBien from Pass 1 is unexpected (produced by filter/ScopeAffirmer, not by correction prompt). CorrectionId={CorrectionId}",
                    correctionId);
                continue;
            }

            string? explanation = tag.Explanation;
            string? correctedForm = tag.CorrectedForm;

            if (string.IsNullOrWhiteSpace(explanation) || string.IsNullOrWhiteSpace(correctedForm))
            {
                logger.LogWarning(
                    "Drop tag: category {Category} requires non-empty explanation and correctedForm. CorrectionId={CorrectionId}",
                    tag.Category, correctionId);
                continue;
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
        string? assignmentPrompt,
        IClaudeClient claude,
        ICorrectionPromptService correctionPromptService,
        Guid correctionId,
        ILogger logger)
    {
        if (tags.Count == 0)
            return tags;

        var inputs = tags
            .Select(t => new LevelFilterTagInput(t.Category, t.SpannedText, t.Explanation, IsSerEstarGTag(t)))
            .ToList();

        ClaudeResponse filterResponse;
        try
        {
            var filterRequest = correctionPromptService.BuildLevelFilterPrompt(cefr, inputs, assignmentPrompt) with { CallSite = "correction.filter", CorrelationId = correctionId };
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

            // O, MuyBien, and ser/estar G tags always pass through regardless of filter decision.
            if (tag.Category == CorrectionTagCategory.Ortografia || tag.Category == CorrectionTagCategory.MuyBien
                || inputs[i].IsSerEstar)
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
                case "muybien":
                    // Convert to MuyBien: highlights the attempt without penalising the student.
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

    private static async Task<IReadOnlyList<RedaccionCorrectionTagDto>> RunScopeAffirmerAsync(
        IReadOnlyList<RedaccionCorrectionTagDto> existingTags,
        string cefr,
        string originalText,
        IClaudeClient claude,
        ICorrectionPromptService correctionPromptService,
        Guid correctionId,
        ILogger logger)
    {
        // Skip C2 (nothing is above C2).
        if (!RedaccionScopeAffirmerPromptBuilder.NextLevel.TryGetValue(cefr, out var nextCefr))
        {
            logger.LogDebug("ScopeAffirmer: skipping for level {Cefr}. CorrectionId={CorrectionId}", cefr, correctionId);
            return [];
        }

        // Skip very long texts to keep cost bounded.
        var wordCount = originalText.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;
        if (wordCount > 800)
        {
            logger.LogDebug("ScopeAffirmer: skipping -- text too long ({Words} words). CorrectionId={CorrectionId}", wordCount, correctionId);
            return [];
        }

        List<ScopeAffirmerSpan>? results;
        try
        {
            var request = correctionPromptService.BuildScopeAffirmerPrompt(cefr, originalText, nextCefr) with { CallSite = "correction.scopeAffirmer", CorrelationId = correctionId };
            var response = await claude.CompleteAsync(request, CancellationToken.None);
            var raw = ContentJsonHelper.StripFences(response.Content);
            results = JsonSerializer.Deserialize<List<ScopeAffirmerSpan>>(raw ?? string.Empty, JsonOpts);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "ScopeAffirmer: call or parse failed; no affirmations added. CorrectionId={CorrectionId}", correctionId);
            return [];
        }

        if (results is null || results.Count == 0)
            return [];

        var affirmerTags = new List<RedaccionCorrectionTagDto>(results.Count);
        foreach (var result in results)
        {
            // Validate span: reject if offsets are out of range or text doesn't match.
            if (result.StartIndex < 0 || result.EndIndex <= result.StartIndex || result.EndIndex > originalText.Length)
            {
                logger.LogDebug(
                    "ScopeAffirmer: drop result -- bad offsets [{Start},{End}) for text length {Len}. CorrectionId={CorrectionId}",
                    result.StartIndex, result.EndIndex, originalText.Length, correctionId);
                continue;
            }
            var actualSpan = originalText.Substring(result.StartIndex, result.EndIndex - result.StartIndex);
            if (!string.Equals(actualSpan, result.SpannedText, StringComparison.Ordinal))
            {
                logger.LogDebug(
                    "ScopeAffirmer: drop result -- hallucinated span '{Span}' not at [{Start},{End}). CorrectionId={CorrectionId}",
                    result.SpannedText, result.StartIndex, result.EndIndex, correctionId);
                continue;
            }

            var explanation = $"¡Bien hecho! Usaste {result.StructureLabel} -- una estructura de {result.StructureLevel}. " +
                              $"Aunque está por encima de tu nivel oficial ({cefr.ToUpperInvariant()}), lo aplicaste correctamente.";

            affirmerTags.Add(new RedaccionCorrectionTagDto(
                Category: CorrectionTagCategory.MuyBien,
                StartIndex: result.StartIndex,
                EndIndex: result.EndIndex,
                SpannedText: result.SpannedText,
                Explanation: explanation,
                CorrectedForm: null));
        }

        return affirmerTags;
    }

    private static IReadOnlyList<RedaccionCorrectionTagDto> MergeAndDedupWithAffirmer(
        IReadOnlyList<RedaccionCorrectionTagDto> filteredTags,
        IReadOnlyList<RedaccionCorrectionTagDto> affirmerTags,
        Guid correctionId,
        ILogger logger)
    {
        if (affirmerTags.Count == 0)
            return filteredTags;

        // Filtered tags are always authoritative. Affirmer tags are additive and lose any overlap.
        // Start with all filtered tags, then add affirmer tags that don't overlap any existing tag.
        var result = new List<RedaccionCorrectionTagDto>(filteredTags.Count + affirmerTags.Count);
        result.AddRange(filteredTags);

        foreach (var tag in affirmerTags.OrderBy(t => t.StartIndex))
        {
            var overlaps = result.Any(existing =>
                tag.StartIndex < existing.EndIndex && existing.StartIndex < tag.EndIndex);

            if (overlaps)
            {
                logger.LogDebug(
                    "ScopeAffirmer: drop overlapping affirmer span [{Start},{End}). CorrectionId={CorrectionId}",
                    tag.StartIndex, tag.EndIndex, correctionId);
                continue;
            }

            result.Add(tag);
        }

        return result.OrderBy(t => t.StartIndex).ToList();
    }

    // Word-boundary regex avoids false positives from words containing "ser" or "estar" as substrings.
    private static readonly Regex SerRegex = new(@"\bser\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex EstarRegex = new(@"\bestar\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static bool IsSerEstarGTag(RedaccionCorrectionTagDto tag)
    {
        if (tag.Category != CorrectionTagCategory.Gramatica) return false;
        var expl = tag.Explanation ?? "";
        return SerRegex.IsMatch(expl) && EstarRegex.IsMatch(expl);
    }

    // Internal DTO mirroring redaccion-correction.schema.json. Exposed as a record so tests
    // can construct fixture payloads against the same shape the production code parses.
    public record RedaccionCorrectionDto(
        [property: JsonPropertyName("schemaVersion")] int SchemaVersion,
        [property: JsonPropertyName("tags")] IReadOnlyList<RedaccionCorrectionTagDto>? Tags);

    public record RedaccionCorrectionTagDto(
        [property: JsonPropertyName("category")] string Category,
        [property: JsonPropertyName("startIndex")] int StartIndex,
        [property: JsonPropertyName("endIndex")] int EndIndex,
        [property: JsonPropertyName("spannedText")] string SpannedText,
        [property: JsonPropertyName("explanation")] string? Explanation,
        [property: JsonPropertyName("correctedForm")] string? CorrectedForm,
        [property: JsonPropertyName("contextBefore")] string? ContextBefore = null);

    private record FilterDecision(
        [property: JsonPropertyName("index")] int Index,
        [property: JsonPropertyName("decision")] string Decision);
}
