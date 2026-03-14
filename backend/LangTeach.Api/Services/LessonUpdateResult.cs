using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public abstract record LessonUpdateResult
{
    public sealed record Success(LessonDto Lesson) : LessonUpdateResult;
    public sealed record NotFound : LessonUpdateResult;
    public sealed record InvalidStudent : LessonUpdateResult;
}
