namespace LangTeach.Api.AI;

public interface ICorrectionPromptService
{
    (ClaudeRequest Request, ClaudeToolDefinition Tool) BuildCorrectionToolCall(RedaccionCorrectionPromptContext ctx);
    (ClaudeRequest Request, ClaudeToolDefinition Tool) BuildLevelFilterToolCall(string cefr, IReadOnlyList<LevelFilterTagInput> tags, string? assignmentPrompt = null);
    (ClaudeRequest Request, ClaudeToolDefinition Tool) BuildScopeAffirmerToolCall(string studentCefr, string studentText, string nextCefr);
}
