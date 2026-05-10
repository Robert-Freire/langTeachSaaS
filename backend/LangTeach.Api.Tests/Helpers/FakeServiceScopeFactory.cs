using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Helpers;

/// <summary>
/// A minimal IServiceScopeFactory for unit tests. Creates scopes backed by a fixed
/// IServiceProvider, so background Task.Run work (e.g. fire-and-forget corrections)
/// can resolve the same stub/mock dependencies the test registered.
/// </summary>
public sealed class FakeServiceScopeFactory : IServiceScopeFactory
{
    private readonly IServiceProvider _provider;

    public FakeServiceScopeFactory(IServiceProvider provider) => _provider = provider;

    public IServiceScope CreateScope() => new FakeScope(_provider);

    private sealed class FakeScope : IServiceScope
    {
        public IServiceProvider ServiceProvider { get; }
        public FakeScope(IServiceProvider provider) => ServiceProvider = provider;
        public void Dispose() { }
    }
}
