using FluentAssertions;
using LangTeach.Api.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Services;

public class TelegramStateStoreTests : IDisposable
{
    private readonly IMemoryCache _cache;
    private readonly TelegramStateStore _sut;

    public TelegramStateStoreTests()
    {
        _cache = new MemoryCache(Options.Create(new MemoryCacheOptions()));
        _sut = new TelegramStateStore(_cache);
    }

    public void Dispose() => _cache.Dispose();

    // --- Connect code tests ---

    [Fact]
    public void ConsumeConnectCode_ReturnsTeacherId_WhenCodeExists()
    {
        var teacherId = Guid.NewGuid();
        _sut.SetConnectCode("CODE1", teacherId, TimeSpan.FromMinutes(10));

        var result = _sut.ConsumeConnectCode("CODE1");

        result.Should().Be(teacherId);
    }

    [Fact]
    public void ConsumeConnectCode_ReturnsNull_WhenCodeDoesNotExist()
    {
        var result = _sut.ConsumeConnectCode("UNKNOWN");

        result.Should().BeNull();
    }

    [Fact]
    public void ConsumeConnectCode_ReturnsNull_OnSecondConsume_OneTimeUse()
    {
        var teacherId = Guid.NewGuid();
        _sut.SetConnectCode("CODE2", teacherId, TimeSpan.FromMinutes(10));

        _sut.ConsumeConnectCode("CODE2");
        var second = _sut.ConsumeConnectCode("CODE2");

        second.Should().BeNull();
    }

    // --- Conversation state tests ---

    [Fact]
    public void GetConversationState_ReturnsState_WhenSet()
    {
        var state = new TelegramConversationState
        {
            TranscribedText = "hola",
            Students = [new TelegramStudentEntry(1, Guid.NewGuid(), "Marco")]
        };

        _sut.SetConversationState(12345L, state, TimeSpan.FromMinutes(10));
        var result = _sut.GetConversationState(12345L);

        result.Should().NotBeNull();
        result!.TranscribedText.Should().Be("hola");
        result.Students.Should().HaveCount(1);
    }

    [Fact]
    public void GetConversationState_ReturnsNull_WhenNotSet()
    {
        var result = _sut.GetConversationState(99999L);

        result.Should().BeNull();
    }

    [Fact]
    public void RemoveConversationState_ClearsState()
    {
        var state = new TelegramConversationState { TranscribedText = "test" };
        _sut.SetConversationState(111L, state, TimeSpan.FromMinutes(10));

        _sut.RemoveConversationState(111L);
        var result = _sut.GetConversationState(111L);

        result.Should().BeNull();
    }

    [Fact]
    public void ConversationState_ChatIds_AreIsolated()
    {
        var stateA = new TelegramConversationState { TranscribedText = "A" };
        var stateB = new TelegramConversationState { TranscribedText = "B" };

        _sut.SetConversationState(1L, stateA, TimeSpan.FromMinutes(10));
        _sut.SetConversationState(2L, stateB, TimeSpan.FromMinutes(10));

        _sut.GetConversationState(1L)!.TranscribedText.Should().Be("A");
        _sut.GetConversationState(2L)!.TranscribedText.Should().Be("B");
    }
}
