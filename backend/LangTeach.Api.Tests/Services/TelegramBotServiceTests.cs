using System.Net;
using FluentAssertions;
using LangTeach.Api.Services;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Services;

public class TelegramBotServiceTests
{
    private const string TestToken = "8641885923:AAGdFakeTokenWithColonForTesting";

    [Fact]
    public async Task SendMessageAsync_DoesNotThrowNotSupportedException_WhenTokenContainsColon()
    {
        // Regression for #620: HttpClient was parsing "bot{token}" as a URI scheme
        // because the bot token contains ':', producing NotSupportedException.
        var (service, capture) = BuildService(HttpStatusCode.OK);

        var act = () => service.SendMessageAsync(123, "hello");

        await act.Should().NotThrowAsync();
        capture.LastRequestUri.Should().NotBeNull();
        capture.LastRequestUri!.AbsoluteUri.Should().Be(
            $"https://api.telegram.org/bot{TestToken}/sendMessage");
    }

    [Fact]
    public async Task SendMessageAsync_PostsJsonPayloadWithChatIdAndText()
    {
        var (service, capture) = BuildService(HttpStatusCode.OK);

        await service.SendMessageAsync(42, "hi there");

        capture.LastRequestBody.Should().Contain("\"chat_id\":42");
        capture.LastRequestBody.Should().Contain("\"text\":\"hi there\"");
    }

    [Fact]
    public async Task DownloadFileAsync_UsesRelativeGetFileAndAbsoluteFileUri()
    {
        // getFile returns a fake file_path; the second request must hit the absolute
        // /file/bot{token}/ URL (different base path than the bot API).
        var requests = new List<Uri>();
        var capture = new CapturingHandler(req =>
        {
            requests.Add(req.RequestUri!);
            if (req.RequestUri!.AbsolutePath.EndsWith("/getFile", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        "{\"ok\":true,\"result\":{\"file_path\":\"voice/file_1.oga\"}}"),
                };
            }
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(new byte[] { 1, 2, 3 }),
            };
        });

        var httpClient = new HttpClient(capture)
        {
            BaseAddress = new Uri($"https://api.telegram.org/bot{TestToken}/"),
        };
        var service = new TelegramBotService(
            new SingleClientFactory(httpClient),
            Options.Create(new TelegramOptions { BotToken = TestToken }));

        await using var stream = await service.DownloadFileAsync("AgADfake_id");

        requests.Should().HaveCount(2);
        requests[0].AbsoluteUri.Should().StartWith(
            $"https://api.telegram.org/bot{TestToken}/getFile?file_id=");
        requests[1].AbsoluteUri.Should().Be(
            $"https://api.telegram.org/file/bot{TestToken}/voice/file_1.oga");
    }

    private static (TelegramBotService service, CapturingHandler capture) BuildService(
        HttpStatusCode status, string responseBody = "{}")
    {
        var capture = new CapturingHandler(_ => new HttpResponseMessage(status)
        {
            Content = new StringContent(responseBody),
        });

        // Mirror the Program.cs registration: token lives inside the base address.
        var httpClient = new HttpClient(capture)
        {
            BaseAddress = new Uri($"https://api.telegram.org/bot{TestToken}/"),
        };
        var factory = new SingleClientFactory(httpClient);
        var options = Options.Create(new TelegramOptions { BotToken = TestToken });

        return (new TelegramBotService(factory, options), capture);
    }

    private sealed class CapturingHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        : HttpMessageHandler
    {
        public Uri? LastRequestUri { get; private set; }
        public string LastRequestBody { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequestUri = request.RequestUri;
            if (request.Content is not null)
                LastRequestBody = await request.Content.ReadAsStringAsync(cancellationToken);
            return responder(request);
        }
    }

    private sealed class SingleClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }
}
