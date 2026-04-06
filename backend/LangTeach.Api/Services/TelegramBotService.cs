using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Services;

public class TelegramBotService : ITelegramBotService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _token;

    public TelegramBotService(IHttpClientFactory httpClientFactory, IOptions<TelegramOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _token = options.Value.BotToken;
    }

    public async Task SendMessageAsync(long chatId, string text, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("Telegram");
        var payload = new { chat_id = chatId, text };
        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"bot{_token}/sendMessage", content, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<Stream> DownloadFileAsync(string fileId, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("Telegram");

        // Step 1: resolve file path
        var fileInfoResponse = await client.GetAsync($"bot{_token}/getFile?file_id={Uri.EscapeDataString(fileId)}", ct);
        fileInfoResponse.EnsureSuccessStatusCode();

        var json = await fileInfoResponse.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        var filePath = doc.RootElement
            .GetProperty("result")
            .GetProperty("file_path")
            .GetString()
            ?? throw new InvalidOperationException("Telegram getFile returned no file_path.");

        // Step 2: download file bytes
        var fileResponse = await client.GetAsync($"file/bot{_token}/{filePath}", ct);
        fileResponse.EnsureSuccessStatusCode();

        var ms = new MemoryStream();
        await fileResponse.Content.CopyToAsync(ms, ct);
        ms.Position = 0;
        return ms;
    }
}
