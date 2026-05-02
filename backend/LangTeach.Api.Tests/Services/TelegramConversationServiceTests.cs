using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Tests.Services;

public class TelegramConversationServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly TelegramStateStore _stateStore;
    private readonly StubTelegramBotService _botService;
    private readonly StubTranscriptionService _transcriptionService;
    private readonly FakeReflectionExtractionService _extractionService;
    private readonly TelegramConversationService _sut;
    private readonly IMemoryCache _cache;

    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly long _chatId = 999_001L;

    public TelegramConversationServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        _cache = new MemoryCache(Options.Create(new MemoryCacheOptions()));
        _stateStore = new TelegramStateStore(_cache);
        _botService = new StubTelegramBotService();
        _transcriptionService = new StubTranscriptionService();
        _extractionService = new FakeReflectionExtractionService();

        var difficultyService = new DifficultyTrendService(_db, NullLogger<DifficultyTrendService>.Instance);
        var profileSvc = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogySvc = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, profileSvc);
        var sessionLogService = new SessionLogService(_db, difficultyService, pedagogySvc, NullLogger<SessionLogService>.Instance);
        var studentService = new StudentService(_db, NullLogger<StudentService>.Instance, pedagogySvc);

        _sut = new TelegramConversationService(
            _db,
            _stateStore,
            _botService,
            _transcriptionService,
            sessionLogService,
            studentService,
            _extractionService,
            NullLogger<TelegramConversationService>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        _cache.Dispose();
    }

    private async Task<Student> CreateStudentAsync(string name)
    {
        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = _teacherId,
            Name = name,
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Students.Add(student);
        await _db.SaveChangesAsync();
        return student;
    }

    private void LinkTeacher()
    {
        _db.Set<TelegramLink>().Add(new TelegramLink
        {
            ChatId = _chatId,
            TeacherId = _teacherId,
            CreatedAt = DateTime.UtcNow
        });
        _db.SaveChanges();
    }

    private static TelegramUpdate TextUpdate(long chatId, string text) => new()
    {
        UpdateId = 1,
        Message = new TelegramMessage
        {
            MessageId = 1,
            Chat = new TelegramChat { Id = chatId },
            Text = text
        }
    };

    private static TelegramUpdate VoiceUpdate(long chatId, string fileId = "file123") => new()
    {
        UpdateId = 2,
        Message = new TelegramMessage
        {
            MessageId = 2,
            Chat = new TelegramChat { Id = chatId },
            Voice = new TelegramVoice { FileId = fileId }
        }
    };

    // --- Connect flow ---

    [Fact]
    public async Task ConnectCode_ValidCode_InsertsLinkAndConfirms()
    {
        var code = "TESTCODE";
        _stateStore.SetConnectCode(code, _teacherId, TimeSpan.FromMinutes(10));

        await _sut.HandleUpdateAsync(TextUpdate(_chatId, $"/connect {code}"), CancellationToken.None);

        var link = await _db.Set<TelegramLink>().FirstOrDefaultAsync(l => l.ChatId == _chatId);
        link.Should().NotBeNull();
        link!.TeacherId.Should().Be(_teacherId);
        _botService.LastSentMessage.Should().Contain("Connected");
    }

    [Fact]
    public async Task ConnectCode_InvalidCode_SendsErrorReply_NoDbRow()
    {
        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "/connect BADCODE"), CancellationToken.None);

        var link = await _db.Set<TelegramLink>().FirstOrDefaultAsync(l => l.ChatId == _chatId);
        link.Should().BeNull();
        _botService.LastSentMessage.Should().Contain("invalid or has expired");
    }

    // --- Unlinked chat ---

    [Fact]
    public async Task UnlinkedChat_NonConnectMessage_SendsNotConnectedReply()
    {
        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "Hola, hoy trabajamos vocabulario"), CancellationToken.None);

        _botService.LastSentMessage.Should().Contain("not linked");
        _botService.LastSentChatId.Should().Be(_chatId);
    }

    // --- Text message, no student match ---

    [Fact]
    public async Task TextMessage_NoStudentMatch_SavesStateAndSendsStudentList()
    {
        LinkTeacher();
        await CreateStudentAsync("Marco");
        await CreateStudentAsync("Sophie");

        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "Hemos trabajado ser y estar"), CancellationToken.None);

        var state = _stateStore.GetConversationState(_chatId);
        state.Should().NotBeNull();
        state!.TranscribedText.Should().Be("Hemos trabajado ser y estar");
        state.Students.Should().HaveCount(2);
        _botService.LastSentMessage.Should().Contain("Which student");
        _botService.LastSentMessage.Should().Contain("Marco");
    }

    // --- Text message, student name matched in text ---

    [Fact]
    public async Task TextMessage_MatchesStudentName_CreatesSessionLogImmediately()
    {
        LinkTeacher();
        var student = await CreateStudentAsync("Marco");

        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "Marco worked on ser/estar today"), CancellationToken.None);

        var logs = await _db.SessionLogs.Where(s => s.StudentId == student.Id).ToListAsync();
        logs.Should().HaveCount(1);
        logs[0].GeneralNotes.Should().Be("Marco worked on ser/estar today");
        _botService.LastSentMessage.Should().Contain("Logged for Marco");
        _stateStore.GetConversationState(_chatId).Should().BeNull();
    }

    // --- Student selection reply ---

    [Fact]
    public async Task StudentSelectionByNumber_CreatesSessionLog()
    {
        LinkTeacher();
        var student = await CreateStudentAsync("Ricardo");

        // Set up pending state manually
        var convState = new TelegramConversationState
        {
            TranscribedText = "great vocabulary session",
            Students = [new TelegramStudentEntry(1, student.Id, "Ricardo")]
        };
        _stateStore.SetConversationState(_chatId, convState, TimeSpan.FromMinutes(10));

        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "1"), CancellationToken.None);

        var logs = await _db.SessionLogs.Where(s => s.StudentId == student.Id).ToListAsync();
        logs.Should().HaveCount(1);
        logs[0].GeneralNotes.Should().Be("great vocabulary session");
        _botService.LastSentMessage.Should().Contain("Logged for Ricardo");
        _stateStore.GetConversationState(_chatId).Should().BeNull();
    }

    [Fact]
    public async Task StudentSelectionByName_CreatesSessionLog()
    {
        LinkTeacher();
        var student = await CreateStudentAsync("Sophie");

        var convState = new TelegramConversationState
        {
            TranscribedText = "lots of grammar",
            Students = [new TelegramStudentEntry(1, student.Id, "Sophie")]
        };
        _stateStore.SetConversationState(_chatId, convState, TimeSpan.FromMinutes(10));

        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "Sophie"), CancellationToken.None);

        var logs = await _db.SessionLogs.Where(s => s.StudentId == student.Id).ToListAsync();
        logs.Should().HaveCount(1);
        _botService.LastSentMessage.Should().Contain("Logged for Sophie");
    }

    // --- No students ---

    [Fact]
    public async Task NoStudents_SendsAddStudentReply()
    {
        LinkTeacher();

        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "today was a great class"), CancellationToken.None);

        _botService.LastSentMessage.Should().Contain("no students");
        _stateStore.GetConversationState(_chatId).Should().BeNull();
    }

    // --- Voice message ---

    [Fact]
    public async Task VoiceMessage_TranscribesAndAsksForStudent()
    {
        LinkTeacher();
        await CreateStudentAsync("Ana");

        await _sut.HandleUpdateAsync(VoiceUpdate(_chatId), CancellationToken.None);

        // StubTranscriptionService returns "[Test transcription]"; no name match => asks for student
        var state = _stateStore.GetConversationState(_chatId);
        state.Should().NotBeNull();
        _botService.LastSentMessage.Should().Contain("Which student");
    }

    [Fact]
    public async Task TranscriptionFailure_SendsManualTextReply()
    {
        LinkTeacher();
        await CreateStudentAsync("Ana");

        // Create a conversation service that uses a throwing transcription service
        var throwingTranscription = new ThrowingTranscriptionService();
        var difficultyService = new DifficultyTrendService(_db, NullLogger<DifficultyTrendService>.Instance);
        var profileSvc = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogySvc = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, profileSvc);
        var sessionLogService = new SessionLogService(_db, difficultyService, pedagogySvc, NullLogger<SessionLogService>.Instance);
        var studentService = new StudentService(_db, NullLogger<StudentService>.Instance, pedagogySvc);
        var sut = new TelegramConversationService(
            _db, _stateStore, _botService, throwingTranscription,
            sessionLogService, studentService, _extractionService,
            NullLogger<TelegramConversationService>.Instance);

        await sut.HandleUpdateAsync(VoiceUpdate(_chatId), CancellationToken.None);

        _botService.LastSentMessage.Should().Contain("text message");
        _stateStore.GetConversationState(_chatId).Should().BeNull();
    }

    // --- Structured field extraction ---

    [Fact]
    public async Task TextMessage_MatchedStudent_MapsExtractedFieldsOntoSessionLog()
    {
        LinkTeacher();
        var student = await CreateStudentAsync("Marco");

        _extractionService.Result = new ExtractedReflectionDto(
            WhatWasCovered: new ExtractedTextFieldDto("ser vs estar", ExtractionMode.Replace),
            AreasToImprove: new ExtractedTextFieldDto("needs more practice with preterite", ExtractionMode.Replace),
            EmotionalSignals: "engaged",
            HomeworkAssigned: new ExtractedTextFieldDto("complete exercises 3 and 4", ExtractionMode.Replace),
            NextLessonIdeas: new ExtractedTextFieldDto("past tenses review", ExtractionMode.Replace),
            SessionDate: null,
            SuggestedDifficulties: new List<SuggestedDifficultyDto>
            {
                new("confuses ser and estar", "Grammar", "Copulas", "Medium")
            },
            RawExtractionJson: null,
            SessionTitle: null,
            TopicTags: [],
            PreviousHomeworkStatus: null,
            TeachingTodos: [],
            TeacherFollowups: [],
            LevelReassessment: null,
            DurationMinutes: null,
            IsCancelled: null,
            DifficultiesWorkedOn: [],
            SessionStartTime: null, NewSessionTitle: null, NewSessionDate: null);

        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "Marco worked on ser/estar today"), CancellationToken.None);

        var log = await _db.SessionLogs.SingleAsync(s => s.StudentId == student.Id);
        log.ActualContent.Should().Be("ser vs estar");
        log.HomeworkAssigned.Should().Be("complete exercises 3 and 4");
        log.NextSessionTopics.Should().Be("past tenses review");
        log.GeneralNotes.Should().Be("needs more practice with preterite\nengaged");
        _extractionService.LastInput.Should().Be("Marco worked on ser/estar today");
    }

    [Fact]
    public async Task TextMessage_MatchedStudent_WritesVoiceNoteApplicationRow()
    {
        LinkTeacher();
        var student = await CreateStudentAsync("Marco");

        _extractionService.Result = new ExtractedReflectionDto(
            WhatWasCovered: new ExtractedTextFieldDto("ser vs estar", ExtractionMode.Replace),
            AreasToImprove: null,
            EmotionalSignals: null,
            HomeworkAssigned: null,
            NextLessonIdeas: null,
            SessionDate: null,
            SuggestedDifficulties: new List<SuggestedDifficultyDto>(),
            RawExtractionJson: "{\"whatWasCovered\":\"ser vs estar\"}",
            SessionTitle: null,
            TopicTags: [],
            PreviousHomeworkStatus: null,
            TeachingTodos: [],
            TeacherFollowups: [],
            LevelReassessment: null,
            DurationMinutes: null,
            IsCancelled: null,
            DifficultiesWorkedOn: [],
            SessionStartTime: null, NewSessionTitle: null, NewSessionDate: null);

        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "Marco trabajamos ser vs estar"), CancellationToken.None);

        var log = await _db.SessionLogs.SingleAsync(s => s.StudentId == student.Id);
        var application = await _db.VoiceNoteApplications.SingleAsync(a => a.SessionLogId == log.Id);
        application.VoiceNoteId.Should().BeNull();
        application.Transcription.Should().Be("Marco trabajamos ser vs estar");
        application.RawExtractionJson.Should().Be("{\"whatWasCovered\":\"ser vs estar\"}");
        application.ApplicationType.Should().Be(ApplicationType.Create);
    }

    [Fact]
    public async Task TextMessage_MatchedStudent_UsesExtractedSessionDate()
    {
        LinkTeacher();
        var student = await CreateStudentAsync("Marco");

        _extractionService.Result = new ExtractedReflectionDto(
            WhatWasCovered: new ExtractedTextFieldDto("condicionales", ExtractionMode.Replace),
            AreasToImprove: null,
            EmotionalSignals: null,
            HomeworkAssigned: null,
            NextLessonIdeas: null,
            SessionDate: "2026-04-06",
            SuggestedDifficulties: new List<SuggestedDifficultyDto>(),
            RawExtractionJson: null,
            SessionTitle: null,
            TopicTags: [],
            PreviousHomeworkStatus: null,
            TeachingTodos: [],
            TeacherFollowups: [],
            LevelReassessment: null,
            DurationMinutes: null,
            IsCancelled: null,
            DifficultiesWorkedOn: [],
            SessionStartTime: null, NewSessionTitle: null, NewSessionDate: null);

        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "Marco el pasado lunes trabajamos los condicionales"), CancellationToken.None);

        var log = await _db.SessionLogs.SingleAsync(s => s.StudentId == student.Id);
        log.SessionDate.Should().Be(new DateTime(2026, 4, 6, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task TextMessage_ExtractionFailure_FallsBackToRawGeneralNotes()
    {
        LinkTeacher();
        var student = await CreateStudentAsync("Marco");

        _extractionService.ThrowOnNext = new InvalidOperationException("AI unavailable");

        await _sut.HandleUpdateAsync(TextUpdate(_chatId, "Marco did great today"), CancellationToken.None);

        var log = await _db.SessionLogs.SingleAsync(s => s.StudentId == student.Id);
        log.GeneralNotes.Should().Be("Marco did great today");
        log.ActualContent.Should().BeNull();
        log.HomeworkAssigned.Should().BeNull();
        log.NextSessionTopics.Should().BeNull();
        _botService.LastSentMessage.Should().Contain("Logged for Marco");
    }

    private class ThrowingTranscriptionService : ITranscriptionService
    {
        public Task<string> TranscribeAsync(Stream audio, string fileName, string contentType, CancellationToken ct = default)
            => throw new InvalidOperationException("Transcription service unavailable");
    }

    private class FakeReflectionExtractionService : IReflectionExtractionService
    {
        public ExtractedReflectionDto? Result { get; set; }
        public Exception? ThrowOnNext { get; set; }
        public string? LastInput { get; private set; }

        public Task<ExtractedReflectionDto> ExtractAsync(string text, IReadOnlyList<string>? knownDifficulties = null, CancellationToken ct = default)
        {
            LastInput = text;
            if (ThrowOnNext is not null)
            {
                var ex = ThrowOnNext;
                ThrowOnNext = null;
                throw ex;
            }
            // Default: echo input into AreasToImprove so existing tests asserting GeneralNotes == raw text keep passing.
            var result = Result ?? new ExtractedReflectionDto(
                WhatWasCovered: null,
                AreasToImprove: new ExtractedTextFieldDto(text, ExtractionMode.Replace),
                EmotionalSignals: null,
                HomeworkAssigned: null,
                NextLessonIdeas: null,
                SessionDate: null,
                SuggestedDifficulties: new List<SuggestedDifficultyDto>(),
                RawExtractionJson: null,
                SessionTitle: null,
                TopicTags: [],
                PreviousHomeworkStatus: null,
                TeachingTodos: [],
                TeacherFollowups: [],
                LevelReassessment: null,
                DurationMinutes: null,
                IsCancelled: null,
                DifficultiesWorkedOn: [],
                SessionStartTime: null, NewSessionTitle: null, NewSessionDate: null);
            return Task.FromResult(result);
        }
    }
}
