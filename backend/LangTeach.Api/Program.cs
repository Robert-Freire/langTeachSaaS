using Azure.Identity;
using Azure.Storage.Blobs;
using LangTeach.Api.AI;
using LangTeach.Api.Auth;
using LangTeach.Api.Data;
using Microsoft.AspNetCore.Authentication;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Infrastructure;
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

    // Validate all required config keys after Key Vault is loaded, before any service registration.
    // This ensures the app fails fast with a clear message instead of crashing mid-startup.
    // When adding a new Key Vault secret, add its key here so missing config is caught at startup.
    StartupConfigValidator.ValidateRequiredConfig(
        builder.Configuration,
        [
            "ConnectionStrings:Default",
            "Auth0:Domain",
            "Auth0:Audience",
            "Claude:ApiKey",
            "AzureBlobStorage:ConnectionString",
            "AzureSpeech:ApiKey",
            "AzureSpeech:Region",
        ]);
}

// CORS
var corsOrigins = new[]
{
    "http://localhost:5173",
    "http://localhost:5174",
    builder.Configuration["AllowedOrigins:Swa"],
    builder.Configuration["AllowedOrigins:E2e"],
}
.Where(o => !string.IsNullOrWhiteSpace(o))
.Distinct(StringComparer.OrdinalIgnoreCase)
.ToArray();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(corsOrigins!)
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
builder.Services.AddHttpClient("AzureSpeech", client =>
{
    var apiKey = builder.Configuration["AzureSpeech:ApiKey"] ?? "";
    client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", apiKey);
    client.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddScoped<IClaudeClient, ClaudeApiClient>();
builder.Services.AddSingleton<ISectionProfileService, SectionProfileService>();
builder.Services.AddSingleton<IPedagogyConfigService, PedagogyConfigService>();
builder.Services.AddSingleton<IContentSchemaService, ContentSchemaService>();
builder.Services.AddSingleton<IGrammarValidationService, GrammarValidationService>();
builder.Services.AddScoped<IPromptService, PromptService>();

builder.Services.AddOptions<GenerationLimitsOptions>()
    .Bind(builder.Configuration.GetSection(GenerationLimitsOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddScoped<IUsageLimitService, UsageLimitService>();

builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IUserInfoService, UserInfoService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddSingleton(_ =>
{
    // Belt-and-suspenders guard: the startup validator covers this in production,
    // but dev/e2e environments skip the validator and still require blob storage
    // (BlobStorageService.InitializeAsync runs unconditionally at startup).
    var connStr = builder.Configuration["AzureBlobStorage:ConnectionString"];
    if (string.IsNullOrWhiteSpace(connStr))
        throw new InvalidOperationException("AzureBlobStorage:ConnectionString is not configured.");
    return new BlobServiceClient(connStr);
});
builder.Services.AddSingleton<BlobStorageService>();
builder.Services.AddSingleton<IBlobStorageService>(sp => sp.GetRequiredService<BlobStorageService>());
builder.Services.AddScoped<IMaterialService, MaterialService>();

builder.Services.Configure<AzureSpeechOptions>(builder.Configuration.GetSection(AzureSpeechOptions.SectionName));

if (builder.Environment.IsEnvironment("E2ETesting") || builder.Environment.IsEnvironment("Testing"))
    builder.Services.AddScoped<ITranscriptionService, StubTranscriptionService>();
else
    builder.Services.AddScoped<ITranscriptionService, AzureSpeechTranscriptionService>();

builder.Services.AddSingleton<VoiceNoteBlobStorage>();
builder.Services.AddSingleton<IVoiceNoteBlobStorage>(sp => sp.GetRequiredService<VoiceNoteBlobStorage>());
builder.Services.AddScoped<IVoiceNoteService, VoiceNoteService>();
builder.Services.AddScoped<ILessonService, LessonService>();
builder.Services.AddScoped<ILessonNoteService, LessonNoteService>();
builder.Services.AddScoped<ISessionLogService, SessionLogService>();
builder.Services.AddScoped<ISessionHistoryService, SessionHistoryService>();
builder.Services.AddScoped<ICurriculumGenerationService, CurriculumGenerationService>();
builder.Services.AddScoped<ICurriculumValidationService, CurriculumValidationService>();
builder.Services.AddSingleton<ICurriculumTemplateService, CurriculumTemplateService>();
builder.Services.AddSingleton<ISessionMappingService, SessionMappingService>();

QuestPDF.Settings.License = LicenseType.Community;
builder.Services.AddScoped<IPdfExportService, PdfExportService>();

var app = builder.Build();

// Eagerly resolve singletons that load embedded resources so malformed JSON fails at startup.
_ = app.Services.GetRequiredService<ISectionProfileService>();
_ = app.Services.GetRequiredService<IPedagogyConfigService>();
_ = app.Services.GetRequiredService<IGrammarValidationService>();

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
        var pedagogyConfig = app.Services.GetRequiredService<IPedagogyConfigService>();
        await SeedData.SeedAsync(db, pedagogyConfig, startupLogger);
    }

    var blobService = scope.ServiceProvider.GetService<BlobStorageService>();
    if (blobService is not null)
        await blobService.InitializeAsync();

    var voiceNoteBlobStorage = scope.ServiceProvider.GetService<VoiceNoteBlobStorage>();
    if (voiceNoteBlobStorage is not null)
        await voiceNoteBlobStorage.InitializeAsync();
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

// Visual seed: dotnet run -- --visual-seed <auth0-user-id|email>
var visualSeedIndex = Array.IndexOf(args, "--visual-seed");
if (visualSeedIndex >= 0)
{
    var teacherLookup = (visualSeedIndex + 1 < args.Length ? args[visualSeedIndex + 1] : null)?.Trim();
    if (string.IsNullOrWhiteSpace(teacherLookup))
    {
        Console.Error.WriteLine("Usage: --visual-seed <auth0-user-id|email>");
        return 1;
    }

    using var visualSeedScope = app.Services.CreateScope();
    var visualSeedDb     = visualSeedScope.ServiceProvider.GetRequiredService<AppDbContext>();
    var visualSeedLogger = visualSeedScope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var seeded = await DemoSeeder.SeedVisualAsync(visualSeedDb, teacherLookup, visualSeedLogger);
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
