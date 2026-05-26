using LangTeach.Api.Data.Models;

namespace LangTeach.Api.Tests.Services;

public class CorrectionStatusTests
{
    [Fact]
    public void Encolada_ConstantValue_IsEncolada()
    {
        Assert.Equal("Encolada", CorrectionStatus.Encolada);
    }

    [Fact]
    public void IsValid_Encolada_ReturnsTrue()
    {
        Assert.True(CorrectionStatus.IsValid(CorrectionStatus.Encolada));
    }

    [Fact]
    public void IsValid_Pendiente_StillReturnsTrue()
    {
        Assert.True(CorrectionStatus.IsValid(CorrectionStatus.Pendiente));
    }

    [Theory]
    [InlineData("Pendiente")]
    [InlineData("Entregada")]
    [InlineData("Encolada")]
    [InlineData("Corrigiendo")]
    [InlineData("Corregida")]
    [InlineData("CorreccionFallida")]
    public void IsValid_AllKnownStatuses_ReturnsTrue(string status)
    {
        Assert.True(CorrectionStatus.IsValid(status));
    }

    [Theory]
    [InlineData("")]
    [InlineData("Unknown")]
    [InlineData("encolada")]
    public void IsValid_UnknownStatus_ReturnsFalse(string status)
    {
        Assert.False(CorrectionStatus.IsValid(status));
    }
}
