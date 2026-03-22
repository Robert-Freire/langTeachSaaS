using FluentAssertions;
using LangTeach.Api.Infrastructure;
using Microsoft.Extensions.Configuration;

namespace LangTeach.Api.Tests.Infrastructure;

public class StartupConfigValidatorTests
{
    private static IConfiguration BuildConfig(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();

    [Fact]
    public void ValidateRequiredConfig_AllKeysPresent_DoesNotThrow()
    {
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["Foo"] = "bar",
            ["Baz"] = "qux",
        });

        var act = () => StartupConfigValidator.ValidateRequiredConfig(config, ["Foo", "Baz"]);

        act.Should().NotThrow();
    }

    [Fact]
    public void ValidateRequiredConfig_OneMissingKey_ThrowsWithKeyName()
    {
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["Present"] = "value",
        });

        var act = () => StartupConfigValidator.ValidateRequiredConfig(config, ["Present", "Missing"]);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Missing*");
    }

    [Fact]
    public void ValidateRequiredConfig_MultipleMissingKeys_ThrowsListingAll()
    {
        var config = BuildConfig(new Dictionary<string, string?>());

        var act = () => StartupConfigValidator.ValidateRequiredConfig(config, ["KeyA", "KeyB", "KeyC"]);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*KeyA*")
            .And.Message.Should().Contain("KeyB").And.Contain("KeyC");
    }

    [Fact]
    public void ValidateRequiredConfig_WhitespaceValue_TreatedAsMissing()
    {
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["MyKey"] = "   ",
        });

        var act = () => StartupConfigValidator.ValidateRequiredConfig(config, ["MyKey"]);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*MyKey*");
    }

    [Fact]
    public void ValidateRequiredConfig_NullValue_TreatedAsMissing()
    {
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["MyKey"] = null,
        });

        var act = () => StartupConfigValidator.ValidateRequiredConfig(config, ["MyKey"]);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*MyKey*");
    }
}
