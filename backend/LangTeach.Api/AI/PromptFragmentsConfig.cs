namespace LangTeach.Api.AI;

public sealed record PromptFragmentsConfig(
    string CefrCue,
    string[] NativeLanguageBullets,
    string PersonalisationDirective,
    string MotivationSuffix,
    string LessonSystemOpener,
    string CurriculumSystemOpener,
    string ReplanSuggestionOpener,
    string ReflectionExtractionOpener,
    string WhatWasCoveredFallbackOpener,
    string StudentProfileExtractionOpener,
    string GrammarLevelExpertOpener);
