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

    public ClaudeRequest BuildCorrectionPrompt(RedaccionCorrectionPromptContext ctx) =>
        _correctionBuilder.Build(ctx);

    public ClaudeRequest BuildLevelFilterPrompt(string cefr, IReadOnlyList<LevelFilterTagInput> tags, string? assignmentPrompt = null) =>
        _filterBuilder.Build(cefr, tags, assignmentPrompt);

    public ClaudeRequest BuildScopeAffirmerPrompt(string studentCefr, string studentText, string nextCefr) =>
        _scopeAffirmerBuilder.Build(studentCefr, studentText, nextCefr);
}
