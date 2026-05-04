namespace LangTeach.Api.AI;

public sealed record PromptFragmentsConfig(
    string CefrCue,
    string[] NativeLanguageBullets,
    string PersonalisationDirective,
    string MotivationSuffix,
    string LessonSystemOpener,
    string CurriculumSystemOpener);
