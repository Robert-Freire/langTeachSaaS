using FluentAssertions;
using LangTeach.Api.AI;

namespace LangTeach.Api.Tests.AI;

public class RedaccionCorrectionTimeoutsTests
{
    [Fact]
    public void HttpClientSeconds_Is600()
    {
        RedaccionCorrectionTimeouts.HttpClientSeconds.Should().Be(600);
    }

    [Fact]
    public void StaleCorrigiendoSeconds_ExceedsHttpClientSeconds()
    {
        RedaccionCorrectionTimeouts.StaleCorrigiendoSeconds
            .Should().BeGreaterThan(RedaccionCorrectionTimeouts.HttpClientSeconds);
    }
}
