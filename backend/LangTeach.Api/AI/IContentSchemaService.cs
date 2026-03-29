namespace LangTeach.Api.AI;

public interface IContentSchemaService
{
    /// <summary>
    /// Returns the JSON Schema string for the given content type key, or null if no schema exists.
    /// </summary>
    string? GetSchema(string contentType);
}
