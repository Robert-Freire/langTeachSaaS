using System.Security.Cryptography;
using System.Text;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Infrastructure;

public class TelegramWebhookSecretFilter : IActionFilter
{
    private const string HeaderName = "X-Telegram-Bot-Api-Secret-Token";

    private readonly string _expectedSecret;
    private readonly IWebHostEnvironment _env;

    public TelegramWebhookSecretFilter(IOptions<TelegramOptions> options, IWebHostEnvironment env)
    {
        _expectedSecret = options.Value.WebhookSecret;
        _env = env;
    }

    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (string.IsNullOrWhiteSpace(_expectedSecret))
        {
            // Skip validation in Development/Testing/E2ETesting when no secret is configured.
            // In production StartupConfigValidator ensures the secret is always set, so this
            // path is unreachable there. Fail closed for any other unconfigured environment.
            if (_env.IsDevelopment()
                || _env.IsEnvironment("Testing")
                || _env.IsEnvironment("E2ETesting"))
            {
                return;
            }

            context.Result = new UnauthorizedResult();
            return;
        }

        if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var value))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        // Fixed-time comparison to prevent timing attacks
        var incoming = Encoding.UTF8.GetBytes(value.ToString());
        var expected = Encoding.UTF8.GetBytes(_expectedSecret);
        if (!CryptographicOperations.FixedTimeEquals(incoming, expected))
        {
            context.Result = new UnauthorizedResult();
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
