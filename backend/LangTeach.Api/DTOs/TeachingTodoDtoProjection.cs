using System.Linq.Expressions;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.DTOs;

public static class TeachingTodoDtoProjection
{
    public static readonly Expression<Func<TeacherFollowup, TeachingTodoDto>> Projection =
        f => new TeachingTodoDto(
            f.Id.ToString(),
            f.Text,
            f.CreatedAt,
            f.SourceSessionLogId != null ? f.SourceSessionLogId.ToString() : null,
            f.Status,
            f.CoveredInSessionLogId != null ? f.CoveredInSessionLogId.ToString() : null);

    public static readonly Func<TeacherFollowup, TeachingTodoDto> Compiled = Projection.Compile();
}
