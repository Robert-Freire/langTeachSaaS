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

        var difficultyService = new DifficultyTrendService(_db, NullLogger<DifficultyTrendService>.Instance);
        var sessionLogService = new SessionLogService(_db, difficultyService, NullLogger<SessionLogService>.Instance);
        var studentService = new StudentService(_db, NullLogger<StudentService>.Instance);

        _sut = new TelegramConversationService(
            _db,
            _stateStore,
            _botService,
            _transcriptionService,
            sessionLogService,
            studentService,
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

        // StubTranscriptionService returns empty string; no name match => asks for student
        var state = _stateStore.GetConversationState(_chatId);
        state.Should().NotBeNull();
        _botService.LastSentMessage.Should().Contain("Which student");
    }
}
