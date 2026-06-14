using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

internal static class ReflectionMapper
{
    private static readonly JsonSerializerOptions CamelCaseOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    internal static CreateSessionLogRequest ToSessionLogRequest(ExtractedReflectionDto extracted, string rawNotes)
    {
        var generalNotes = JoinGeneralNotes(extracted.AreasToImprove?.Value, extracted.EmotionalSignals);

        return new CreateSessionLogRequest
        {
            SessionDate = ParseSessionDate(extracted.SessionDate),
            ActualContent = extracted.WhatWasCovered?.Value,
            HomeworkAssigned = extracted.HomeworkAssigned?.Value,
            NextSessionTopics = extracted.NextSessionTopics?.Value,
            GeneralNotes = string.IsNullOrEmpty(generalNotes) ? null : generalNotes,
            SuggestedDifficulties = extracted.SuggestedDifficulties.Count > 0
                ? extracted.SuggestedDifficulties
                : null,
            Title = NormalizeSessionTitle(extracted.SessionTitle),
            VoiceNoteTranscription = rawNotes,
            RawExtractionJson = extracted.RawExtractionJson
        };
    }

    internal static IEnumerable<ProposalDto> ToSessionFieldProposals(
        ExtractedReflectionDto extracted,
        SessionLogDto? current,
        ProposalFieldsConfig config,
        ResolvedTarget? resolvedTarget = null,
        bool hasAdminIntent = false,
        string? adminMemberName = null)
    {
        var extractedTopicTags = extracted.TopicTags.Count > 0
            ? JsonSerializer.Serialize(extracted.TopicTags, CamelCaseOpts)
            : null;

        var fieldValues = new Dictionary<string, (string? current, string? extracted)>
        {
            ["title"] = (current?.Title, NormalizeSessionTitle(extracted.SessionTitle)),
            ["actualContent"] = (current?.ActualContent, extracted.WhatWasCovered?.Value),
            ["generalNotes"] = (current?.GeneralNotes, extracted.AreasToImprove?.Value),
            ["homeworkAssigned"] = (current?.HomeworkAssigned, extracted.HomeworkAssigned?.Value),
            ["nextSessionTopics"] = (current?.NextSessionTopics, extracted.NextSessionTopics?.Value),
            ["duration"] = (current?.Duration?.ToString(), extracted.DurationMinutes?.ToString()),
            ["topicTags"] = (current?.TopicTags, extractedTopicTags),
        };

        foreach (var f in config.SessionFields)
        {
            if (!fieldValues.TryGetValue(f.Field, out var vals)) continue;
            var proposal = MakeFieldProposal("session", f.Field, f.Label, vals.current, vals.extracted);
            if (proposal is not null) yield return proposal;
        }

        if (extracted.ProposedNewSession is { } proposed)
        {
            var dateOnly = proposed.Date ?? DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
            var sessionDate = extracted.SessionStartTime is { } t
                ? $"{dateOnly}T{t}"
                : dateOnly;

            object newSessionPayload;
            if (resolvedTarget is { Target.Kind: "group", Target.ResolvedId: { } groupId })
            {
                object? adminCallout = hasAdminIntent && !string.IsNullOrWhiteSpace(adminMemberName)
                    ? new { memberName = adminMemberName, rawText = extracted.RawGroupMention ?? adminMemberName }
                    : null;

                newSessionPayload = new
                {
                    title = proposed.Title,
                    sessionDate,
                    groupId,
                    groupName = resolvedTarget.ResolvedGroupName ?? resolvedTarget.Target.RawMention,
                    cefrLevel = resolvedTarget.ResolvedCefrLevel,
                    requiresConfirmation = false,
                    adminCallout,
                };
            }
            else if (resolvedTarget is { IsConfident: false })
            {
                newSessionPayload = new
                {
                    title = proposed.Title,
                    sessionDate,
                    rawGroupMention = resolvedTarget.Target.RawMention,
                    requiresConfirmation = true,
                    candidates = resolvedTarget.Target.Candidates
                        .Select(c => new { id = c.Id, name = c.Name, cefrLevel = c.CefrLevel })
                        .ToList(),
                };
            }
            else
            {
                newSessionPayload = new { title = proposed.Title, sessionDate };
            }

            var payloadElement = JsonSerializer.SerializeToElement(newSessionPayload, CamelCaseOpts);
            yield return new ProposalDto(
                Guid.NewGuid().ToString(),
                "newSession",
                "newSession",
                "New Session",
                null,
                proposed.Title,
                payloadElement);
        }
    }

    internal static string? NormalizeSessionTitle(string? title)
    {
        if (title is null) return null;
        var trimmed = title.Trim();
        return trimmed.Length > 120 ? trimmed[..120] : trimmed;
    }

    internal static string? JoinGeneralNotes(string? areasToImprove, string? emotionalSignals)
    {
        var joined = string.Join("\n",
            new[] { areasToImprove?.Trim(), emotionalSignals?.Trim() }
                .Where(s => !string.IsNullOrWhiteSpace(s)));
        return string.IsNullOrEmpty(joined) ? null : joined;
    }

    internal static DateTime ParseSessionDate(string? isoDate)
    {
        if (isoDate is not null &&
            DateOnly.TryParseExact(isoDate, "yyyy-MM-dd",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var parsed))
        {
            return parsed.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        }
        return DateTime.UtcNow.Date;
    }

    internal static ProposalDto? MakeFieldProposal(
        string type, string field, string label, string? oldValue, string? newValue)
    {
        if (string.IsNullOrWhiteSpace(newValue)) return null;
        if (string.Equals(oldValue?.Trim(), newValue.Trim(), StringComparison.OrdinalIgnoreCase)) return null;
        return new ProposalDto(Guid.NewGuid().ToString(), type, field, label, oldValue, newValue);
    }
}
