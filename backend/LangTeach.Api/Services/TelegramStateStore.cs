using Microsoft.Extensions.Caching.Memory;

namespace LangTeach.Api.Services;

public class TelegramStateStore : ITelegramStateStore
{
    private readonly IMemoryCache _cache;
    private static readonly object ConsumeCodeLock = new();

    public TelegramStateStore(IMemoryCache cache)
    {
        _cache = cache;
    }

    private static string CodeKey(string code) => $"TgCode:{code}";
    private static string ConvKey(long chatId) => $"TgConv:{chatId}";

    public void SetConnectCode(string code, Guid teacherId, TimeSpan expiry)
    {
        _cache.Set(CodeKey(code), teacherId, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiry
        });
    }

    public Guid? ConsumeConnectCode(string code)
    {
        // Lock to make read-then-remove atomic (one-time use guarantee)
        lock (ConsumeCodeLock)
        {
            if (!_cache.TryGetValue(CodeKey(code), out Guid teacherId))
                return null;

            _cache.Remove(CodeKey(code));
            return teacherId;
        }
    }

    public void SetConversationState(long chatId, TelegramConversationState state, TimeSpan expiry)
    {
        _cache.Set(ConvKey(chatId), state, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiry
        });
    }

    public TelegramConversationState? GetConversationState(long chatId)
    {
        _cache.TryGetValue(ConvKey(chatId), out TelegramConversationState? state);
        return state;
    }

    public void RemoveConversationState(long chatId)
    {
        _cache.Remove(ConvKey(chatId));
    }
}
