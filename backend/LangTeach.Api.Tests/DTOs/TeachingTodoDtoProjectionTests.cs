using FluentAssertions;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Tests.DTOs;

public class TeachingTodoDtoProjectionTests
{
    private static TeacherFollowup BuildFollowup(Guid? sourceSessionLogId = null, Guid? coveredInSessionLogId = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            Text = "Work on subjunctive",
            Status = TeacherFollowupStatuses.Pending,
            CreatedAt = new DateTime(2026, 1, 15, 10, 0, 0, DateTimeKind.Utc),
            SourceSessionLogId = sourceSessionLogId,
            CoveredInSessionLogId = coveredInSessionLogId
        };

    [Fact]
    public void Compiled_MapsAllFields()
    {
        var sourceId = Guid.NewGuid();
        var followup = BuildFollowup(sourceSessionLogId: sourceId);

        var dto = TeachingTodoDtoProjection.Compiled(followup);

        dto.Id.Should().Be(followup.Id.ToString());
        dto.Text.Should().Be(followup.Text);
        dto.CreatedAt.Should().Be(followup.CreatedAt);
        dto.SourceSessionLogId.Should().Be(sourceId.ToString());
        dto.Status.Should().Be(followup.Status);
        dto.CoveredInSessionLogId.Should().BeNull();
    }

    [Fact]
    public void Compiled_NullableGuidsMapToNull()
    {
        var followup = BuildFollowup();

        var dto = TeachingTodoDtoProjection.Compiled(followup);

        dto.SourceSessionLogId.Should().BeNull();
        dto.CoveredInSessionLogId.Should().BeNull();
    }

    [Fact]
    public void Projection_ExpressionProducesSameResultAsCompiled()
    {
        var followup = BuildFollowup(sourceSessionLogId: Guid.NewGuid());
        var fromCompiled = TeachingTodoDtoProjection.Compiled(followup);
        var fromExpression = TeachingTodoDtoProjection.Projection.Compile()(followup);

        fromExpression.Should().BeEquivalentTo(fromCompiled);
    }
}
