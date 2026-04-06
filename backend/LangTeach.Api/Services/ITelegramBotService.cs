namespace LangTeach.Api.Services;

public interface ITelegramBotService
{
    Task SendMessageAsync(long chatId, string text, CancellationToken ct = default);
    Task<Stream> DownloadFileAsync(string fileId, CancellationToken ct = default);
}
