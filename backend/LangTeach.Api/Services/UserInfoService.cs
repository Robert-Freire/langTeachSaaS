using System.Net.Http.Headers;
using System.Text.Json;

namespace LangTeach.Api.Services;

public record Auth0UserInfo(string Email, string Name);

public interface IUserInfoService
{
    Task<Auth0UserInfo> GetUserInfoAsync(string bearerToken);
}

public class UserInfoService : IUserInfoService
{
    private const int MaxRetries = 3;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromMilliseconds(500);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<UserInfoService> _logger;

    public UserInfoService(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<UserInfoService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<Auth0UserInfo> GetUserInfoAsync(string bearerToken)
    {
        var domain = _configuration["Auth0:Domain"];
        if (string.IsNullOrEmpty(domain))
        {
            _logger.LogWarning("Auth0:Domain is not configured, cannot fetch /userinfo.");
            return new Auth0UserInfo("", "");
        }

        if (string.IsNullOrWhiteSpace(bearerToken))
        {
            _logger.LogWarning("Missing bearer token, cannot fetch /userinfo.");
            return new Auth0UserInfo("", "");
        }

        for (var attempt = 1; attempt <= MaxRetries; attempt++)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                using var httpResponse = await client.GetAsync($"https://{domain}/userinfo");

                // Permanent failures (4xx auth/client errors) — no retry
                if (!httpResponse.IsSuccessStatusCode && (int)httpResponse.StatusCode < 500 && (int)httpResponse.StatusCode != 429)
                {
                    _logger.LogWarning("Auth0 /userinfo returned permanent error {StatusCode}.", (int)httpResponse.StatusCode);
                    return new Auth0UserInfo("", "");
                }

                // Transient failures (429, 5xx) — treat as retriable via exception path
                httpResponse.EnsureSuccessStatusCode();

                await using var stream = await httpResponse.Content.ReadAsStreamAsync();
                using var doc = await JsonDocument.ParseAsync(stream);

                var email = doc.RootElement.TryGetProperty("email", out var emailProp) ? emailProp.GetString() ?? "" : "";
                var name = doc.RootElement.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "";

                return new Auth0UserInfo(email, name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Auth0 /userinfo attempt {Attempt}/{MaxRetries} failed.", attempt, MaxRetries);
                if (attempt < MaxRetries)
                    await Task.Delay(RetryDelay);
            }
        }

        _logger.LogError("Auth0 /userinfo failed after {MaxRetries} attempts.", MaxRetries);
        return new Auth0UserInfo("", "");
    }
}
