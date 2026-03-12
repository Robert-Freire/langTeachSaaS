using System.Net;
using FluentAssertions;
using LangTeach.Api.Tests.Fixtures;

namespace LangTeach.Api.Tests.Controllers;

public class HealthControllerTests : IClassFixture<WebAppFactory>
{
    private readonly HttpClient _client;

    public HealthControllerTests(WebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("healthy");
    }
}
