namespace LangTeach.Api.Services;

public class StubTelegramBotService : ITelegramBotService
{
    public string? LastSentMessage { get; private set; }
    public long? LastSentChatId { get; private set; }

    public Task SendMessageAsync(long chatId, string text, CancellationToken ct = default)
    {
        LastSentChatId = chatId;
        LastSentMessage = text;
        return Task.CompletedTask;
    }

    public Task<Stream> DownloadFileAsync(string fileId, CancellationToken ct = default)
    {
        return Task.FromResult<Stream>(new MemoryStream());
    }
}
