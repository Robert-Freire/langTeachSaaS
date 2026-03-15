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
        try
        {
            var domain = _configuration["Auth0:Domain"];
            if (string.IsNullOrEmpty(domain))
            {
                _logger.LogWarning("Auth0:Domain is not configured — cannot fetch /userinfo.");
                return new Auth0UserInfo("", "");
            }

            if (string.IsNullOrWhiteSpace(bearerToken))
            {
                _logger.LogWarning("Missing bearer token — cannot fetch /userinfo.");
                return new Auth0UserInfo("", "");
            }

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

            var response = await client.GetStringAsync($"https://{domain}/userinfo");
            var doc      = JsonDocument.Parse(response);

            var email = doc.RootElement.TryGetProperty("email", out var emailProp) ? emailProp.GetString() ?? "" : "";
            var name  = doc.RootElement.TryGetProperty("name",  out var nameProp)  ? nameProp.GetString()  ?? "" : "";

            return new Auth0UserInfo(email, name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch user info from /userinfo.");
            return new Auth0UserInfo("", "");
        }
    }
}
