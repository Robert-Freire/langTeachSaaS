using System.Text.Json.Serialization;

namespace LangTeach.Api.DTOs;

public record TelegramConnectCodeResponse(string Code, DateTime ExpiresAt);

public record TelegramStatusResponse(bool Connected, DateTime? LinkedAt);

// Minimal Telegram Update model — only fields we use
public class TelegramUpdate
{
    [JsonPropertyName("update_id")]
    public long UpdateId { get; set; }

    [JsonPropertyName("message")]
    public TelegramMessage? Message { get; set; }
}

public class TelegramMessage
{
    [JsonPropertyName("message_id")]
    public long MessageId { get; set; }

    [JsonPropertyName("from")]
    public TelegramUser? From { get; set; }

    [JsonPropertyName("chat")]
    public TelegramChat? Chat { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("voice")]
    public TelegramVoice? Voice { get; set; }
}

public class TelegramUser
{
    [JsonPropertyName("id")]
    public long Id { get; set; }
}

public class TelegramChat
{
    [JsonPropertyName("id")]
    public long Id { get; set; }
}

public class TelegramVoice
{
    [JsonPropertyName("file_id")]
    public string FileId { get; set; } = string.Empty;
}
