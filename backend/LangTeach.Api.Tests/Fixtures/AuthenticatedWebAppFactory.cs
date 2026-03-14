using LangTeach.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Fixtures;

public class AuthenticatedWebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            // Remove ALL DbContextOptions<AppDbContext> descriptors added by Program.cs.
            // We cannot call AddDbContext again (it stacks configure actions and causes a
            // dual-provider error). Instead we directly register a pre-built options
            // instance that only references the InMemory provider.
            var toRemove = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                         || d.ServiceType == typeof(DbContextOptions))
                .ToList();
            foreach (var d in toRemove)
                services.Remove(d);

            var inMemoryOptions = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase("IntegrationTestDb")
                .Options;

            services.AddSingleton<DbContextOptions<AppDbContext>>(inMemoryOptions);
            services.AddSingleton<DbContextOptions>(inMemoryOptions);

            // Replace JWT auth with a test scheme that reads claims from request headers.
            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }

    public HttpClient CreateAuthenticatedClient(
        string auth0Id = TestAuthHandler.DefaultAuth0Id,
        string email = TestAuthHandler.DefaultEmail)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Auth0Id", auth0Id);
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        return client;
    }
}
