using Azure.Storage.Blobs;
using LangTeach.Api.Data;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
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

            // Replace blob storage with in-memory implementation
            var blobDescriptors = services
                .Where(d => d.ServiceType == typeof(BlobServiceClient)
                         || d.ServiceType == typeof(BlobStorageService)
                         || d.ServiceType == typeof(IBlobStorageService))
                .ToList();
            foreach (var d in blobDescriptors)
                services.Remove(d);

            var inMemoryBlob = new InMemoryBlobStorageService();
            services.AddSingleton<IBlobStorageService>(inMemoryBlob);
            services.AddSingleton(inMemoryBlob);
        });
    }

    public HttpClient CreateAuthenticatedClient(
        string auth0Id = TestAuthHandler.DefaultAuth0Id,
        string email = TestAuthHandler.DefaultEmail,
        string? name = TestAuthHandler.DefaultName,
        string? emailClaimType = null,
        string? nameClaimType = null)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Auth0Id", auth0Id);
        // HttpClient drops empty-value headers; use a sentinel so the test handler can distinguish "no email" from default
        client.DefaultRequestHeaders.Add("X-Test-Email", string.IsNullOrEmpty(email) ? TestAuthHandler.NoEmailSentinel : email);
        if (name != null)
            client.DefaultRequestHeaders.Add("X-Test-Name", name);
        if (emailClaimType != null)
            client.DefaultRequestHeaders.Add("X-Test-EmailClaimType", emailClaimType);
        if (nameClaimType != null)
            client.DefaultRequestHeaders.Add("X-Test-NameClaimType", nameClaimType);
        return client;
    }
}
