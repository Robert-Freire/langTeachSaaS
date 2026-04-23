using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class TelegramConversationService : ITelegramConversationService
{
    private static readonly TimeSpan ConversationExpiry = TimeSpan.FromMinutes(10);

    private readonly AppDbContext _db;
    private readonly ITelegramStateStore _stateStore;
    private readonly ITelegramBotService _botService;
    private readonly ITranscriptionService _transcriptionService;
    private readonly ISessionLogService _sessionLogService;
    private readonly IStudentService _studentService;
    private readonly IReflectionExtractionService _extractionService;
    private readonly ILogger<TelegramConversationService> _logger;

    public TelegramConversationService(
        AppDbContext db,
        ITelegramStateStore stateStore,
        ITelegramBotService botService,
        ITranscriptionService transcriptionService,
        ISessionLogService sessionLogService,
        IStudentService studentService,
        IReflectionExtractionService extractionService,
        ILogger<TelegramConversationService> logger)
    {
        _db = db;
        _stateStore = stateStore;
        _botService = botService;
        _transcriptionService = transcriptionService;
        _sessionLogService = sessionLogService;
        _studentService = studentService;
        _extractionService = extractionService;
        _logger = logger;
    }

    public async Task HandleUpdateAsync(TelegramUpdate update, CancellationToken ct)
    {
        var message = update.Message;
        if (message is null) return;

        var chatId = message.Chat?.Id ?? message.From?.Id ?? 0;
        if (chatId == 0) return;

        var text = message.Text?.Trim() ?? string.Empty;

        // Step 1: /connect <code> must be checked BEFORE link lookup — valid for unlinked chats
        if (text.StartsWith("/connect", StringComparison.OrdinalIgnoreCase))
        {
            var parts = text.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var code = parts.Length > 1 ? parts[1].Trim() : string.Empty;
            await HandleConnectCodeAsync(chatId, code, ct);
            return;
        }

        // Step 2: require linked account
        var link = await _db.Set<TelegramLink>().FirstOrDefaultAsync(l => l.ChatId == chatId, ct);
        if (link is null)
        {
            await _botService.SendMessageAsync(chatId,
                "This Telegram account is not linked to LangTeach. Open the app, go to Settings, and use the Connect Telegram option to get a code, then send: /connect <code>",
                ct);
            return;
        }

        var teacherId = link.TeacherId;

        // Step 3: check pending conversation state (waiting for student selection)
        var convState = _stateStore.GetConversationState(chatId);
        if (convState is not null)
        {
            await HandleStudentSelectionAsync(chatId, teacherId, text, convState, ct);
            return;
        }

        // Step 4: new message — voice or text
        string notes;
        if (message.Voice is not null)
        {
            try
            {
                using var audioStream = await _botService.DownloadFileAsync(message.Voice.FileId, ct);
                notes = await _transcriptionService.TranscribeAsync(audioStream, "voice.ogg", "audio/ogg", ct);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Transcription failed for chatId={ChatId}", chatId);
                await _botService.SendMessageAsync(chatId,
                    "Sorry, I could not transcribe the audio. Please send your notes as a text message instead.",
                    ct);
                return;
            }
        }
        else if (!string.IsNullOrWhiteSpace(text))
        {
            notes = text;
        }
        else
        {
            return;
        }

        // Fetch teacher's active students
        var studentResult = await _studentService.ListAsync(teacherId, new StudentListQuery { PageSize = 100 }, ct);
        var students = studentResult.Items;

        if (students.Count == 0)
        {
            await _botService.SendMessageAsync(chatId,
                "You have no students yet. Please add a student in the LangTeach app first.",
                ct);
            return;
        }

        // Try to match a student name in the notes using word-token matching to avoid
        // false positives (e.g. "Ana" matching "banana" or "mañana").
        var noteTokens = notes.Split([' ', ',', '.', ';', ':', '!', '?', '\n', '\r'],
            StringSplitOptions.RemoveEmptyEntries);
        var matched = students.FirstOrDefault(s =>
            noteTokens.Any(t => t.Equals(s.Name, StringComparison.OrdinalIgnoreCase)));

        if (matched is not null)
        {
            await CreateSessionLogAndConfirmAsync(chatId, teacherId, matched.Id, matched.Name, notes, ct);
            return;
        }

        // No match — ask teacher to select
        var studentList = students
            .Select((s, i) => $"{i + 1}. {s.Name}")
            .Aggregate((a, b) => $"{a}\n{b}");

        var state = new TelegramConversationState
        {
            TranscribedText = notes,
            Students = students.Select((s, i) => new TelegramStudentEntry(i + 1, s.Id, s.Name)).ToList()
        };
        _stateStore.SetConversationState(chatId, state, ConversationExpiry);

        await _botService.SendMessageAsync(chatId,
            $"Got it. Which student?\n{studentList}",
            ct);
    }

    private async Task HandleStudentSelectionAsync(
        long chatId, Guid teacherId, string reply,
        TelegramConversationState state, CancellationToken ct)
    {
        _stateStore.RemoveConversationState(chatId);

        // Try numeric selection
        TelegramStudentEntry? selected = null;
        if (int.TryParse(reply, out var index))
        {
            selected = state.Students.FirstOrDefault(s => s.Index == index);
        }

        // Try exact name match (case-insensitive); guard against blank to avoid matching first student
        if (selected is null && !string.IsNullOrWhiteSpace(reply))
        {
            selected = state.Students.FirstOrDefault(s =>
                string.Equals(s.Name, reply, StringComparison.OrdinalIgnoreCase));
        }

        if (selected is null)
        {
            var list = state.Students
                .Select(s => $"{s.Index}. {s.Name}")
                .Aggregate((a, b) => $"{a}\n{b}");
            await _botService.SendMessageAsync(chatId,
                $"I didn't understand that. Please reply with a number or name:\n{list}",
                ct);
            // Restore state so teacher can try again
            _stateStore.SetConversationState(chatId, state, ConversationExpiry);
            return;
        }

        await CreateSessionLogAndConfirmAsync(chatId, teacherId, selected.Id, selected.Name, state.TranscribedText, ct);
    }

    private async Task CreateSessionLogAndConfirmAsync(
        long chatId, Guid teacherId, Guid studentId, string studentName,
        string notes, CancellationToken ct)
    {
        var request = await BuildSessionLogRequestAsync(chatId, teacherId, studentId, notes, ct);

        await _sessionLogService.CreateAsync(teacherId, studentId, request, ct);
        _logger.LogInformation("TelegramBot created session log for TeacherId={TeacherId} StudentId={StudentId}", teacherId, studentId);

        await _botService.SendMessageAsync(chatId,
            $"Logged for {studentName}. Summary saved.",
            ct);
    }

    private async Task<CreateSessionLogRequest> BuildSessionLogRequestAsync(
        long chatId, Guid teacherId, Guid studentId, string notes, CancellationToken ct)
    {
        var student = await _studentService.GetByIdAsync(teacherId, studentId, ct);
        var knownDifficulties = student?.Profile.Difficulties
            .Select(d => d.Description)
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .ToList();

        ExtractedReflectionDto? extracted = null;
        try
        {
            extracted = await _extractionService.ExtractAsync(notes, knownDifficulties, ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "TelegramBot reflection extraction failed; falling back to GeneralNotes. ChatId={ChatId} TeacherId={TeacherId} StudentId={StudentId}",
                chatId, teacherId, studentId);
        }

        if (extracted is null)
        {
            return new CreateSessionLogRequest
            {
                SessionDate = DateTime.UtcNow.Date,
                GeneralNotes = notes,
                VoiceNoteTranscription = notes
            };
        }

        // Mirror of SessionLogDialog.tsx:316-346 — join AreasToImprove + EmotionalSignals into GeneralNotes,
        // map the rest onto their structured fields.
        var generalNotes = string.Join("\n",
            new[] { extracted.AreasToImprove?.Value, extracted.EmotionalSignals }
                .Where(s => !string.IsNullOrWhiteSpace(s)));

        return new CreateSessionLogRequest
        {
            SessionDate = ParseSessionDate(extracted.SessionDate),
            ActualContent = extracted.WhatWasCovered?.Value,
            HomeworkAssigned = extracted.HomeworkAssigned?.Value,
            NextSessionTopics = extracted.NextLessonIdeas?.Value,
            GeneralNotes = string.IsNullOrEmpty(generalNotes) ? null : generalNotes,
            SuggestedDifficulties = extracted.SuggestedDifficulties.Count > 0
                ? extracted.SuggestedDifficulties
                : null,
            Title = extracted.SessionTitle is { Length: > 120 } t ? t[..120] : extracted.SessionTitle,
            VoiceNoteTranscription = notes,
            RawExtractionJson = extracted.RawExtractionJson
        };
    }

    public async Task<TelegramStatusResponse> GetLinkStatusAsync(Guid teacherId, CancellationToken ct)
    {
        var link = await _db.Set<TelegramLink>().FirstOrDefaultAsync(l => l.TeacherId == teacherId, ct);
        return new TelegramStatusResponse(link is not null, link?.CreatedAt);
    }

    public async Task<bool> DeleteLinkAsync(Guid teacherId, CancellationToken ct)
    {
        var link = await _db.Set<TelegramLink>().FirstOrDefaultAsync(l => l.TeacherId == teacherId, ct);
        if (link is null) return false;

        _db.Set<TelegramLink>().Remove(link);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private async Task HandleConnectCodeAsync(long chatId, string code, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            await _botService.SendMessageAsync(chatId,
                "Please include your code: /connect <code>",
                ct);
            return;
        }

        var teacherId = _stateStore.ConsumeConnectCode(code);
        if (teacherId is null)
        {
            await _botService.SendMessageAsync(chatId,
                "That code is invalid or has expired. Please generate a new one in the LangTeach app.",
                ct);
            return;
        }

        // Remove any existing link for this chat or teacher, then insert new.
        // SaveChangesAsync is atomic on SQL Server; on in-memory DB (tests) transactions are not supported.
        var existing = await _db.Set<TelegramLink>()
            .Where(l => l.ChatId == chatId || l.TeacherId == teacherId.Value)
            .ToListAsync(ct);
        _db.Set<TelegramLink>().RemoveRange(existing);

        _db.Set<TelegramLink>().Add(new TelegramLink
        {
            ChatId = chatId,
            TeacherId = teacherId.Value,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("TelegramLink created for TeacherId={TeacherId} ChatId={ChatId}", teacherId, chatId);

        await _botService.SendMessageAsync(chatId,
            "Connected! You can now send voice notes or text to log session notes. I'll ask which student after each message.",
            ct);
    }

    private static DateTime ParseSessionDate(string? isoDate)
    {
        if (isoDate is not null &&
            DateOnly.TryParseExact(isoDate, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var parsed))
        {
            return parsed.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        }
        return DateTime.UtcNow.Date;
    }
}
