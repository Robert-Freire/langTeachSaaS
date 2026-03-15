namespace LangTeach.Api.Tests.Helpers;

public class FakeHttpMessageHandler(Func<HttpResponseMessage> responseFactory) : HttpMessageHandler
{
    public FakeHttpMessageHandler(HttpResponseMessage response)
        : this(() => response) { }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
        => Task.FromResult(responseFactory());
}
