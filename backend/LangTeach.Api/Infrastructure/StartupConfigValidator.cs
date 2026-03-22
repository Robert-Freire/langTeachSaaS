using Microsoft.Extensions.Configuration;

namespace LangTeach.Api.Infrastructure;

public static class StartupConfigValidator
{
    /// <summary>
    /// Validates that all required configuration keys are present and non-empty.
    /// Throws a single <see cref="InvalidOperationException"/> listing every missing key.
    /// Call this after Key Vault is loaded and before any service registration.
    /// </summary>
    public static void ValidateRequiredConfig(IConfiguration configuration, IEnumerable<string> requiredKeys)
    {
        var missing = requiredKeys
            .Where(key => string.IsNullOrWhiteSpace(configuration[key]))
            .ToList();

        if (missing.Count == 0)
            return;

        var keyList = string.Join(", ", missing);
        throw new InvalidOperationException(
            $"Application cannot start: the following required configuration keys are missing or empty: {keyList}");
    }
}
