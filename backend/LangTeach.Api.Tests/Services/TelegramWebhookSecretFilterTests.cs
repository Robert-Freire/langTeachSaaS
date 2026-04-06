using FluentAssertions;
using LangTeach.Api.Infrastructure;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.FileProviders;
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

    private static IWebHostEnvironment MakeEnv(string environmentName) =>
        new TestWebHostEnvironment { EnvironmentName = environmentName };

    [Fact]
    public void Filter_WithCorrectSecret_Passes()
    {
        var filter = new TelegramWebhookSecretFilter(
            Options.Create(new TelegramOptions { WebhookSecret = "mysecret" }),
            MakeEnv("Production"));
        var ctx = MakeContext("mysecret");

        filter.OnActionExecuting(ctx);

        ctx.Result.Should().BeNull();
    }

    [Fact]
    public void Filter_WithWrongSecret_Returns401()
    {
        var filter = new TelegramWebhookSecretFilter(
            Options.Create(new TelegramOptions { WebhookSecret = "mysecret" }),
            MakeEnv("Production"));
        var ctx = MakeContext("wrong");

        filter.OnActionExecuting(ctx);

        ctx.Result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public void Filter_MissingHeader_Returns401()
    {
        var filter = new TelegramWebhookSecretFilter(
            Options.Create(new TelegramOptions { WebhookSecret = "mysecret" }),
            MakeEnv("Production"));
        var ctx = MakeContext(null);

        filter.OnActionExecuting(ctx);

        ctx.Result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public void Filter_EmptySecretInDevelopment_PassesAll()
    {
        // Dev mode with no secret configured: bypass validation
        var filter = new TelegramWebhookSecretFilter(
            Options.Create(new TelegramOptions { WebhookSecret = "" }),
            MakeEnv("Development"));
        var ctx = MakeContext(null);

        filter.OnActionExecuting(ctx);

        ctx.Result.Should().BeNull();
    }

    [Fact]
    public void Filter_EmptySecretInTesting_PassesAll()
    {
        var filter = new TelegramWebhookSecretFilter(
            Options.Create(new TelegramOptions { WebhookSecret = "" }),
            MakeEnv("Testing"));
        var ctx = MakeContext(null);

        filter.OnActionExecuting(ctx);

        ctx.Result.Should().BeNull();
    }

    [Fact]
    public void Filter_EmptySecretInProduction_Returns401()
    {
        // Production with empty secret must fail closed (StartupConfigValidator prevents this,
        // but the filter must not be the weak link)
        var filter = new TelegramWebhookSecretFilter(
            Options.Create(new TelegramOptions { WebhookSecret = "" }),
            MakeEnv("Production"));
        var ctx = MakeContext(null);

        filter.OnActionExecuting(ctx);

        ctx.Result.Should().BeOfType<UnauthorizedResult>();
    }

    private class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Testing";
        public string ApplicationName { get; set; } = "Test";
        public string WebRootPath { get; set; } = string.Empty;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
