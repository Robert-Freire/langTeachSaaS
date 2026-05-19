namespace LangTeach.Api.AI;

public class CorrectionPromptService : ICorrectionPromptService
{
    private readonly RedaccionCorrectionPromptBuilder _correctionBuilder;
    private readonly RedaccionLevelFilterPromptBuilder _filterBuilder;
    private readonly RedaccionScopeAffirmerPromptBuilder _scopeAffirmerBuilder;

    public CorrectionPromptService(
        RedaccionCorrectionPromptBuilder correctionBuilder,
        RedaccionLevelFilterPromptBuilder filterBuilder,
        RedaccionScopeAffirmerPromptBuilder scopeAffirmerBuilder)
    {
        _correctionBuilder = correctionBuilder;
        _filterBuilder = filterBuilder;
        _scopeAffirmerBuilder = scopeAffirmerBuilder;
    }

    public (ClaudeRequest Request, ClaudeToolDefinition Tool) BuildCorrectionToolCall(RedaccionCorrectionPromptContext ctx) =>
        _correctionBuilder.BuildWithTool(ctx);

    public (ClaudeRequest Request, ClaudeToolDefinition Tool) BuildLevelFilterToolCall(string cefr, IReadOnlyList<LevelFilterTagInput> tags, string? assignmentPrompt = null) =>
        _filterBuilder.BuildWithTool(cefr, tags, assignmentPrompt);

    public (ClaudeRequest Request, ClaudeToolDefinition Tool) BuildScopeAffirmerToolCall(string studentCefr, string studentText, string nextCefr) =>
        _scopeAffirmerBuilder.BuildWithTool(studentCefr, studentText, nextCefr);
}
