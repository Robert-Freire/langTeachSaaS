namespace LangTeach.Api.Services;

public interface ITelegramStateStore
{
    void SetConnectCode(string code, Guid teacherId, TimeSpan expiry);
    Guid? ConsumeConnectCode(string code);

    void SetConversationState(long chatId, TelegramConversationState state, TimeSpan expiry);
    TelegramConversationState? GetConversationState(long chatId);
    void RemoveConversationState(long chatId);
}

public record TelegramStudentEntry(int Index, Guid Id, string Name);

public class TelegramConversationState
{
    public string TranscribedText { get; set; } = string.Empty;
    public List<TelegramStudentEntry> Students { get; set; } = [];
}
