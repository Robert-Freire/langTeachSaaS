using Microsoft.Extensions.Logging;

namespace LangTeach.Api.Services;

/// <summary>
/// Loads JSON Schema definitions for content types from embedded resources at startup.
///
/// To add a new content type schema:
/// 1. Create <c>data/content-schemas/&lt;content-type-key&gt;.json</c>
/// 2. Add a matching EmbeddedResource entry in LangTeach.Api.csproj
/// No C# changes required.
/// </summary>
public class ContentSchemaService : IContentSchemaService
{
    private readonly Dictionary<string, string> _schemas = new(StringComparer.OrdinalIgnoreCase);

    public ContentSchemaService(ILogger<ContentSchemaService> logger)
    {
        var assembly = typeof(ContentSchemaService).Assembly;
        const string prefix = "LangTeach.Api.ContentSchemas.";

        foreach (var name in assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(prefix, StringComparison.Ordinal) && n.EndsWith(".json", StringComparison.Ordinal)))
        {
            var key = name[prefix.Length..^".json".Length];
            using var stream = assembly.GetManifestResourceStream(name)!;
            using var reader = new StreamReader(stream);
            _schemas[key] = reader.ReadToEnd();
            logger.LogDebug("ContentSchemaService: loaded schema for '{Key}'", key);
        }

        logger.LogInformation("ContentSchemaService: loaded {Count} content type schema(s): {Keys}",
            _schemas.Count, string.Join(", ", _schemas.Keys.Order()));
    }

    /// <inheritdoc/>
    public string? GetSchema(string contentType) =>
        _schemas.TryGetValue(contentType, out var schema) ? schema : null;
}
