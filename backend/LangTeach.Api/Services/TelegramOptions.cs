namespace LangTeach.Api.Services;

public class TelegramOptions
{
    public const string SectionName = "Telegram";

    public string BotToken { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
}
