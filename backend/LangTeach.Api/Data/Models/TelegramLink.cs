namespace LangTeach.Api.Data.Models;

public class TelegramLink
{
    public long ChatId { get; set; }
    public Guid TeacherId { get; set; }
    public DateTime CreatedAt { get; set; }
}
