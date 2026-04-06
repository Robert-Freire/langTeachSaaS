using FluentAssertions;
using LangTeach.Api.Infrastructure;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Services;

public class TelegramWebhookSecretFilterTests
{
    private static ActionExecutingContext MakeContext(string? headerValue)
    {
        var httpContext = new DefaultHttpContext();
        if (headerValue is not null)
            httpContext.Request.Headers["X-Telegram-Bot-Api-Secret-Token"] = headerValue;

        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        return new ActionExecutingContext(actionContext, [], new Dictionary<string, object?>(), new object());
    }

    [Fact]
    public void Filter_WithCorrectSecret_Passes()
    {
        var filter = new TelegramWebhookSecretFilter(
            Options.Create(new TelegramOptions { WebhookSecret = "mysecret" }));
        var ctx = MakeContext("mysecret");

        filter.OnActionExecuting(ctx);

        ctx.Result.Should().BeNull();
    }

    [Fact]
    public void Filter_WithWrongSecret_Returns401()
    {
        var filter = new TelegramWebhookSecretFilter(
            Options.Create(new TelegramOptions { WebhookSecret = "mysecret" }));
        var ctx = MakeContext("wrong");

        filter.OnActionExecuting(ctx);

        ctx.Result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public void Filter_MissingHeader_Returns401()
    {
        var filter = new TelegramWebhookSecretFilter(
            Options.Create(new TelegramOptions { WebhookSecret = "mysecret" }));
        var ctx = MakeContext(null);

        filter.OnActionExecuting(ctx);

        ctx.Result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public void Filter_EmptyConfiguredSecret_PassesAll()
    {
        // Dev/test mode: no secret configured, all requests pass through
        var filter = new TelegramWebhookSecretFilter(
            Options.Create(new TelegramOptions { WebhookSecret = "" }));
        var ctx = MakeContext(null);

        filter.OnActionExecuting(ctx);

        ctx.Result.Should().BeNull();
    }
}
