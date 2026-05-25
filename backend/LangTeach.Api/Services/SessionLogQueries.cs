using System.Linq.Expressions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.Services;

/// <summary>
/// Canonical filters for SessionLog queries that need to include group sessions
/// for students who are members of those groups. Groups sprint #1326: every
/// "all sessions for this student" query MUST use one of these helpers, so
/// group sessions are not silently excluded.
/// </summary>
public static class SessionLogQueries
{
    /// <summary>
    /// Returns SessionLogs (not soft-deleted, scoped to teacher) where either
    /// the session targets this student directly, or it targets a group the
    /// student belongs to.
    /// </summary>
    public static IQueryable<SessionLog> ForStudentIncludingGroups(
        AppDbContext db, Guid teacherId, Guid studentId)
    {
        // Exclude soft-deleted groups: matches the convention applied to soft-deleted students.
        var groupIds = db.StudentGroups
            .Where(sg => sg.StudentId == studentId && !sg.Group.IsDeleted)
            .Select(sg => sg.GroupId);

        return db.SessionLogs
            .Where(sl =>
                sl.TeacherId == teacherId &&
                !sl.IsDeleted &&
                ((sl.StudentId == studentId) ||
                 (sl.GroupId != null && groupIds.Contains(sl.GroupId.Value))));
    }

    /// <summary>
    /// Returns an expression that is true when a SessionLog belongs to the given student directly
    /// or via a group the student is a member of. For use in standalone (non-projection) EF Core
    /// queries where EF Core can translate the expression. Not usable inside a .Select() projection
    /// that correlates with an outer student row (EF Core limitation -- see DashboardService).
    /// </summary>
    public static Expression<Func<SessionLog, bool>> BelongsToStudentExpression(
        AppDbContext db, Guid studentId)
    {
        var groupIds = db.StudentGroups
            .Where(sg => sg.StudentId == studentId && !sg.Group.IsDeleted)
            .Select(sg => sg.GroupId);

        return sl =>
            sl.StudentId == studentId ||
            (sl.GroupId != null && groupIds.Contains(sl.GroupId.Value));
    }
}
