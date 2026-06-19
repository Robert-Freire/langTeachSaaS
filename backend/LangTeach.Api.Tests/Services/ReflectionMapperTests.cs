using LangTeach.Api.AI;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Xunit;

namespace LangTeach.Api.Tests.Services;

public class ReflectionMapperTests
{
    private static ExtractedReflectionDto MakeDto(
        string? sessionTitle = null,
        string? areasToImprove = null,
        string? emotionalSignals = null,
        string? sessionDate = null,
        string? whatWasCovered = null,
        string? homeworkAssigned = null,
        string? nextSessionTopics = null,
        List<SuggestedDifficultyDto>? suggestedDifficulties = null,
        int? durationMinutes = null,
        List<TopicTagDto>? topicTags = null)
    {
        return new ExtractedReflectionDto(
            WhatWasCovered: whatWasCovered is null ? null : new ExtractedTextFieldDto(whatWasCovered, ExtractionMode.Replace),
            AreasToImprove: areasToImprove is null ? null : new ExtractedTextFieldDto(areasToImprove, ExtractionMode.Replace),
            EmotionalSignals: emotionalSignals,
            HomeworkAssigned: homeworkAssigned is null ? null : new ExtractedTextFieldDto(homeworkAssigned, ExtractionMode.Replace),
            NextSessionTopics: nextSessionTopics is null ? null : new ExtractedTextFieldDto(nextSessionTopics, ExtractionMode.Replace),
            SessionDate: sessionDate,
            SuggestedDifficulties: suggestedDifficulties ?? [],
            RawExtractionJson: null,
            SessionTitle: sessionTitle,
            TopicTags: topicTags ?? [],
            PreviousHomeworkStatus: null,
            TeachingTodos: [],
            TeacherFollowups: [],
            LevelReassessment: null,
            DurationMinutes: durationMinutes,
            IsCancelled: null,
            DifficultiesWorkedOn: [],
            SessionStartTime: null,
            ProposedNewSession: null
        );
    }

    [Fact]
    public void NormalizeSessionTitle_ShortTitle_ReturnsUnchanged()
    {
        var result = ReflectionMapper.NormalizeSessionTitle("Hello");
        Assert.Equal("Hello", result);
    }

    [Fact]
    public void NormalizeSessionTitle_ExactlyAtLimit_ReturnsUnchanged()
    {
        var title = new string('a', 120);
        Assert.Equal(title, ReflectionMapper.NormalizeSessionTitle(title));
    }

    [Fact]
    public void NormalizeSessionTitle_OverLimit_TruncatesTo120()
    {
        var title = new string('a', 150);
        var result = ReflectionMapper.NormalizeSessionTitle(title);
        Assert.Equal(120, result!.Length);
    }

    [Fact]
    public void NormalizeSessionTitle_Null_ReturnsNull()
    {
        Assert.Null(ReflectionMapper.NormalizeSessionTitle(null));
    }

    [Fact]
    public void JoinGeneralNotes_BothPresent_JoinsWithNewline()
    {
        var result = ReflectionMapper.JoinGeneralNotes("areas", "emotions");
        Assert.Equal("areas\nemotions", result);
    }

    [Fact]
    public void JoinGeneralNotes_OnlyAreas_ReturnsTrimmedAreas()
    {
        var result = ReflectionMapper.JoinGeneralNotes("areas", null);
        Assert.Equal("areas", result);
    }

    [Fact]
    public void JoinGeneralNotes_BothNull_ReturnsNull()
    {
        Assert.Null(ReflectionMapper.JoinGeneralNotes(null, null));
    }

    [Fact]
    public void ParseSessionDate_ValidIso_ReturnsParsedUtc()
    {
        var result = ReflectionMapper.ParseSessionDate("2025-03-15");
        Assert.Equal(new DateTime(2025, 3, 15, 0, 0, 0, DateTimeKind.Utc), result);
    }

    [Fact]
    public void ParseSessionDate_Null_ReturnsTodayUtc()
    {
        var before = DateTime.UtcNow.Date;
        var result = ReflectionMapper.ParseSessionDate(null);
        Assert.True(result >= before);
    }

    [Fact]
    public void ParseSessionDate_InvalidString_ReturnsTodayUtc()
    {
        var before = DateTime.UtcNow.Date;
        var result = ReflectionMapper.ParseSessionDate("bad-date");
        Assert.True(result >= before);
    }

    [Fact]
    public void ToSessionLogRequest_MapsAllFields()
    {
        var dto = MakeDto(
            sessionTitle: "My Session",
            areasToImprove: "verb tenses",
            emotionalSignals: "motivated",
            sessionDate: "2025-06-01",
            whatWasCovered: "preterite",
            homeworkAssigned: "page 5",
            nextSessionTopics: "subjunctive");

        var result = ReflectionMapper.ToSessionLogRequest(dto, "raw notes");

        Assert.Equal("My Session", result.Title);
        Assert.Equal("preterite", result.ActualContent);
        Assert.Equal("page 5", result.HomeworkAssigned);
        Assert.Equal("subjunctive", result.NextSessionTopics);
        Assert.Equal("verb tenses\nmotivated", result.GeneralNotes);
        Assert.Equal("raw notes", result.VoiceNoteTranscription);
        Assert.Equal(new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc), result.SessionDate);
    }

    [Fact]
    public void ToSessionLogRequest_NoSuggestedDifficulties_SetsNull()
    {
        var dto = MakeDto();
        var result = ReflectionMapper.ToSessionLogRequest(dto, "notes");
        Assert.Null(result.SuggestedDifficulties);
    }

    [Fact]
    public void ToSessionLogRequest_WithSuggestedDifficulties_PopulatesField()
    {
        var difficulties = new List<SuggestedDifficultyDto>
        {
            new("ser vs estar", "Grammar", "Verb", "medium")
        };
        var dto = MakeDto(suggestedDifficulties: difficulties);
        var result = ReflectionMapper.ToSessionLogRequest(dto, "notes");
        Assert.Equal(difficulties, result.SuggestedDifficulties);
    }

    [Fact]
    public void ToSessionFieldProposals_EmitsProposals_ForChangedFields()
    {
        var dto = MakeDto(sessionTitle: "Lesson 1", whatWasCovered: "vocabulary");
        var config = new ProposalFieldsConfig(
            StudentFields: [],
            SkillLevelFields: [],
            SessionFields:
            [
                new SessionFieldEntry("title", "Title", false),
                new SessionFieldEntry("actualContent", "What Was Covered", true),
            ]);

        var proposals = ReflectionMapper.ToSessionFieldProposals(dto, null, config).ToList();

        Assert.Equal(2, proposals.Count);
        Assert.Contains(proposals, p => p.Field == "title" && p.NewValue == "Lesson 1");
        Assert.Contains(proposals, p => p.Field == "actualContent" && p.NewValue == "vocabulary");
    }

    [Fact]
    public void ToSessionFieldProposals_SkipsUnchangedFields()
    {
        var dto = MakeDto(sessionTitle: "Same title");
        var currentSession = new SessionLogDto(
            Id: Guid.NewGuid(), StudentId: Guid.NewGuid(), GroupId: null,
            TargetType: "student", TargetName: "", TeacherId: Guid.NewGuid(),
            SessionDate: null, PlannedContent: null, ActualContent: null,
            HomeworkAssigned: null, PreviousHomeworkStatus: default,
            PreviousHomeworkStatusName: "", NextSessionTopics: null,
            GeneralNotes: null, LevelReassessmentSkill: null, LevelReassessmentLevel: null,
            LinkedLessonId: null, CreatedAt: default, UpdatedAt: default,
            TopicTags: "[]", IsCancelled: false, Status: default, StatusName: "",
            MentionedDifficultyPairs: "[]", SuggestedDifficulties: "[]",
            Duration: null, Title: "Same title", HasVoiceNote: false);

        var config = new ProposalFieldsConfig(
            StudentFields: [],
            SkillLevelFields: [],
            SessionFields: [new SessionFieldEntry("title", "Title", false)]);

        var proposals = ReflectionMapper.ToSessionFieldProposals(dto, currentSession, config).ToList();

        Assert.Empty(proposals);
    }

    [Fact]
    public void ToSessionFieldProposals_EmitsDurationProposal_WhenExtracted()
    {
        var dto = MakeDto(durationMinutes: 50);
        var config = new ProposalFieldsConfig(
            StudentFields: [],
            SkillLevelFields: [],
            SessionFields: [new SessionFieldEntry("duration", "Duration (minutes)", false)]);

        var proposals = ReflectionMapper.ToSessionFieldProposals(dto, null, config).ToList();

        Assert.Single(proposals);
        Assert.Equal("duration", proposals[0].Field);
        Assert.Equal("50", proposals[0].NewValue);
    }

    [Fact]
    public void ToSessionFieldProposals_SkipsDurationProposal_WhenNotExtracted()
    {
        var dto = MakeDto(durationMinutes: null);
        var config = new ProposalFieldsConfig(
            StudentFields: [],
            SkillLevelFields: [],
            SessionFields: [new SessionFieldEntry("duration", "Duration (minutes)", false)]);

        var proposals = ReflectionMapper.ToSessionFieldProposals(dto, null, config).ToList();

        Assert.Empty(proposals);
    }

    [Fact]
    public void ToSessionFieldProposals_EmitsTopicTagsProposal_WhenExtracted()
    {
        var tags = new List<TopicTagDto> { new("comida", "vocabulary"), new("llevarse bien/mal", "grammar") };
        var dto = MakeDto(topicTags: tags);
        var config = new ProposalFieldsConfig(
            StudentFields: [],
            SkillLevelFields: [],
            SessionFields: [new SessionFieldEntry("topicTags", "Topic Tags", false)]);

        var proposals = ReflectionMapper.ToSessionFieldProposals(dto, null, config).ToList();

        Assert.Single(proposals);
        Assert.Equal("topicTags", proposals[0].Field);
        Assert.Contains("comida", proposals[0].NewValue);
    }

    [Fact]
    public void ToSessionFieldProposals_TopicTagsProposal_PreservesAccentedCharacters()
    {
        var tags = new List<TopicTagDto> { new("pretérito perfecto", "Grammar"), new("conversación", null) };
        var dto = MakeDto(topicTags: tags);
        var config = new ProposalFieldsConfig(
            StudentFields: [],
            SkillLevelFields: [],
            SessionFields: [new SessionFieldEntry("topicTags", "Topic Tags", false)]);

        var proposals = ReflectionMapper.ToSessionFieldProposals(dto, null, config).ToList();

        Assert.Single(proposals);
        Assert.DoesNotContain("\\u00", proposals[0].NewValue);
        Assert.Contains("pretérito perfecto", proposals[0].NewValue);
        Assert.Contains("conversación", proposals[0].NewValue);
    }

    [Fact]
    public void ToSessionFieldProposals_SkipsTopicTagsProposal_WhenEmpty()
    {
        var dto = MakeDto(topicTags: []);
        var config = new ProposalFieldsConfig(
            StudentFields: [],
            SkillLevelFields: [],
            SessionFields: [new SessionFieldEntry("topicTags", "Topic Tags", false)]);

        var proposals = ReflectionMapper.ToSessionFieldProposals(dto, null, config).ToList();

        Assert.Empty(proposals);
    }
}
