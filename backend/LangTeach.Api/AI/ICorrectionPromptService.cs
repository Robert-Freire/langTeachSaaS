namespace LangTeach.Api.AI;

public interface ICorrectionPromptService
{
    ClaudeRequest BuildCorrectionPrompt(RedaccionCorrectionPromptContext ctx);
    ClaudeRequest BuildLevelFilterPrompt(string cefr, IReadOnlyList<LevelFilterTagInput> tags, string? assignmentPrompt = null);
}
