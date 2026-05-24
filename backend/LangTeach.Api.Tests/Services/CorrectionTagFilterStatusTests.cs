using LangTeach.Api.Data.Models;

namespace LangTeach.Api.Tests.Services;

public class CorrectionTagFilterStatusTests
{
    [Fact]
    public void Constants_AreLowercaseWords()
    {
        Assert.Equal("kept", CorrectionTagFilterStatus.Kept);
        Assert.Equal("removed", CorrectionTagFilterStatus.Removed);
    }

    [Theory]
    [InlineData("kept")]
    [InlineData("removed")]
    public void IsValid_KnownStatuses_ReturnsTrue(string status)
    {
        Assert.True(CorrectionTagFilterStatus.IsValid(status));
    }

    [Theory]
    [InlineData("")]
    [InlineData("softened")]
    [InlineData("Kept")]
    [InlineData("unknown")]
    public void IsValid_UnknownStatus_ReturnsFalse(string status)
    {
        Assert.False(CorrectionTagFilterStatus.IsValid(status));
    }
}
