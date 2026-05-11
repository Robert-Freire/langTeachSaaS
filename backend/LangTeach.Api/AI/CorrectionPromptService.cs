namespace LangTeach.Api.AI;

public class CorrectionPromptService : ICorrectionPromptService
{
    private readonly RedaccionCorrectionPromptBuilder _correctionBuilder;
    private readonly RedaccionLevelFilterPromptBuilder _filterBuilder;

    public CorrectionPromptService(
        RedaccionCorrectionPromptBuilder correctionBuilder,
        RedaccionLevelFilterPromptBuilder filterBuilder)
    {
        _correctionBuilder = correctionBuilder;
        _filterBuilder = filterBuilder;
    }

    public ClaudeRequest BuildCorrectionPrompt(RedaccionCorrectionPromptContext ctx) =>
        _correctionBuilder.Build(ctx);

    public ClaudeRequest BuildLevelFilterPrompt(string cefr, IReadOnlyList<LevelFilterTagInput> tags, string? assignmentPrompt = null) =>
        _filterBuilder.Build(cefr, tags, assignmentPrompt);
}
