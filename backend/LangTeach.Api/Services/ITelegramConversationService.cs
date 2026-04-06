using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ITelegramConversationService
{
    Task HandleUpdateAsync(TelegramUpdate update, CancellationToken ct);
    Task<TelegramStatusResponse> GetLinkStatusAsync(Guid teacherId, CancellationToken ct);
    Task<bool> DeleteLinkAsync(Guid teacherId, CancellationToken ct);
}
