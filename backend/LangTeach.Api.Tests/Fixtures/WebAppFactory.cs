using Azure.Storage.Blobs;
using LangTeach.Api.Data;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Fixtures;

public class WebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));

            if (descriptor != null)
                services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase("TestDb"));

            // Replace blob storage with in-memory implementations
            var blobDescriptors = services
                .Where(d => d.ServiceType == typeof(BlobServiceClient)
                         || d.ServiceType == typeof(BlobStorageService)
                         || d.ServiceType == typeof(IBlobStorageService)
                         || d.ServiceType == typeof(VoiceNoteBlobStorage)
                         || d.ServiceType == typeof(IVoiceNoteBlobStorage))
                .ToList();
            foreach (var d in blobDescriptors)
                services.Remove(d);

            services.AddSingleton<IBlobStorageService>(new InMemoryBlobStorageService());
            services.AddSingleton<IVoiceNoteBlobStorage>(new InMemoryVoiceNoteBlobStorage());
        });
    }
}
