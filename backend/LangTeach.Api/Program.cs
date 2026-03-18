using Azure.Identity;
using LangTeach.Api.AI;
using LangTeach.Api.Auth;
using LangTeach.Api.Data;
using Microsoft.AspNetCore.Authentication;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using LangTeach.Api.Services.PdfExport;
using Microsoft.Extensions.Options;
using QuestPDF.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.File("logs/api-.log", rollingInterval: RollingInterval.Day,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog((ctx, services, config) => config
    .ReadFrom.Configuration(ctx.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.File("logs/api-.log", rollingInterval: RollingInterval.Day,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"));

// Key Vault (production only — dev uses appsettings.Development.json)
if (!builder.Environment.IsDevelopment() && !builder.Environment.IsEnvironment("Testing") && !builder.Environment.IsEnvironment("E2ETesting"))
{
    var kvUri = builder.Configuration["KeyVault:Uri"]
                ?? throw new InvalidOperationException("KeyVault:Uri is not configured.");
    builder.Configuration.AddAzureKeyVault(new Uri(kvUri), new DefaultAzureCredential());
}

// CORS
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(
                  "http://localhost:5173",
                  "http://localhost:5174",
                  builder.Configuration["AllowedOrigins:Swa"] ?? "")
              .AllowAnyHeader()
              .AllowAnyMethod()));

// Authentication
if (builder.Environment.IsEnvironment("E2ETesting"))
{
    builder.Services.AddAuthentication(E2ETestAuthHandler.SchemeName)
        .AddScheme<AuthenticationSchemeOptions, E2ETestAuthHandler>(E2ETestAuthHandler.SchemeName, _ => { });
}
else
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = $"https://{builder.Configuration["Auth0:Domain"]}/";
            options.Audience = builder.Configuration["Auth0:Audience"];
            options.TokenValidationParameters = new TokenValidationParameters
            {
                NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier
            };
        });
}

builder.Services.AddAuthorization();

// Require auth on all endpoints by default
builder.Services.AddControllers(options =>
    options.Filters.Add(new AuthorizeFilter()))
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new ContentBlockTypeJsonConverter()));

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default") ?? ""));
builder.Services.AddDbContextFactory<AppDbContext>(lifetime: ServiceLifetime.Scoped);

builder.Services.AddHttpClient();

builder.Services.Configure<ClaudeClientOptions>(
    builder.Configuration.GetSection(ClaudeClientOptions.SectionName));
builder.Services.AddHttpClient("Claude", (sp, client) =>
{
    var opts = sp.GetRequiredService<IOptions<ClaudeClientOptions>>().Value;
    client.BaseAddress = new Uri(opts.BaseUrl);
    client.DefaultRequestHeaders.Add("x-api-key", opts.ApiKey);
    client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
});
builder.Services.AddScoped<IClaudeClient, ClaudeApiClient>();
builder.Services.AddScoped<IPromptService, PromptService>();

builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IUserInfoService, UserInfoService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<ILessonService, LessonService>();
builder.Services.AddScoped<ILessonNoteService, LessonNoteService>();

QuestPDF.Settings.License = LicenseType.Community;
builder.Services.AddScoped<IPdfExportService, PdfExportService>();

var app = builder.Build();

// Apply pending migrations and seed reference data on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var startupLogger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    if (!app.Environment.IsEnvironment("Testing"))
    {
        startupLogger.LogInformation("Applying pending EF migrations...");
        await db.Database.MigrateAsync();
        startupLogger.LogInformation("Migrations applied successfully.");
        await SeedData.SeedAsync(db, startupLogger);
    }
}

// Demo seeder: dotnet run -- --seed <auth0-user-id|email>
var seedIndex = Array.IndexOf(args, "--seed");
if (seedIndex >= 0)
{
    var teacherLookup = (seedIndex + 1 < args.Length ? args[seedIndex + 1] : null)?.Trim();
    if (string.IsNullOrWhiteSpace(teacherLookup))
    {
        Console.Error.WriteLine("Usage: --seed <auth0-user-id|email>");
        return 1;
    }

    using var seedScope = app.Services.CreateScope();
    var seedDb     = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
    var seedLogger = seedScope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var seeded = await DemoSeeder.SeedAsync(seedDb, teacherLookup, seedLogger);
    return seeded ? 0 : 1;
}

app.UseSerilogRequestLogging(options =>
{
    options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000}ms";
});

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

await app.RunAsync();
return 0;

public partial class Program { }
