using LangTeach.Api.AI;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public static class ReflectionMapper
{
    public static CreateSessionLogRequest ToSessionLogRequest(ExtractedReflectionDto extracted, string rawNotes)
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

    public static IEnumerable<ProposalDto> ToSessionFieldProposals(
        ExtractedReflectionDto extracted,
        SessionLogDto? current,
        ProposalFieldsConfig config)
    {
        var fieldValues = new Dictionary<string, (string? current, string? extracted)>
        {
            ["title"] = (current?.Title, NormalizeSessionTitle(extracted.SessionTitle)),
            ["actualContent"] = (current?.ActualContent, extracted.WhatWasCovered?.Value),
            ["generalNotes"] = (current?.GeneralNotes, extracted.AreasToImprove?.Value),
            ["homeworkAssigned"] = (current?.HomeworkAssigned, extracted.HomeworkAssigned?.Value),
            ["nextSessionTopics"] = (current?.NextSessionTopics, extracted.NextSessionTopics?.Value),
        };

        foreach (var f in config.SessionFields)
        {
            if (!fieldValues.TryGetValue(f.Field, out var vals)) continue;
            var proposal = MakeFieldProposal("session", f.Field, f.Label, vals.current, vals.extracted);
            if (proposal is not null) yield return proposal;
        }
    }

    public static string? NormalizeSessionTitle(string? title) =>
        title is { Length: > 120 } t ? t[..120] : title;

    public static string? JoinGeneralNotes(string? areasToImprove, string? emotionalSignals)
    {
        var joined = string.Join("\n",
            new[] { areasToImprove, emotionalSignals }
                .Where(s => !string.IsNullOrWhiteSpace(s)));
        return string.IsNullOrEmpty(joined) ? null : joined;
    }

    public static DateTime ParseSessionDate(string? isoDate)
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

    private static ProposalDto? MakeFieldProposal(
        string type, string field, string label, string? oldValue, string? newValue)
    {
        if (string.IsNullOrWhiteSpace(newValue)) return null;
        if (string.Equals(oldValue?.Trim(), newValue.Trim(), StringComparison.OrdinalIgnoreCase)) return null;
        return new ProposalDto(Guid.NewGuid().ToString(), type, field, label, oldValue, newValue);
    }
}
