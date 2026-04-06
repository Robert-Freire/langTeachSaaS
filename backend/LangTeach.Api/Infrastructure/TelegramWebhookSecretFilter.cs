using LangTeach.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Infrastructure;

public class TelegramWebhookSecretFilter : IActionFilter
{
    private const string HeaderName = "X-Telegram-Bot-Api-Secret-Token";

    private readonly string _expectedSecret;

    public TelegramWebhookSecretFilter(IOptions<TelegramOptions> options)
    {
        _expectedSecret = options.Value.WebhookSecret;
    }

    public void OnActionExecuting(ActionExecutingContext context)
    {
        // If no secret is configured, skip validation (dev/test mode)
        if (string.IsNullOrEmpty(_expectedSecret)) return;

        if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var value)
            || value.ToString() != _expectedSecret)
        {
            context.Result = new UnauthorizedResult();
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
