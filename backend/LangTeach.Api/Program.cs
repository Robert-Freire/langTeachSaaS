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
    // The transcription-provider-specific keys vary based on the active provider flag.
    var transcriptionProvider = builder.Configuration["Transcription:Provider"] ?? "AzureOpenAIWhisper";
    var requiredKeys = new List<string>
    {
        "ConnectionStrings:Default",
        "Auth0:Domain",
        "Auth0:Audience",
        "Claude:ApiKey",
        "AzureBlobStorage:ConnectionString",
        "Telegram:BotToken",
        "Telegram:WebhookSecret",
    };
    if (transcriptionProvider == "AzureSpeech")
    {
        requiredKeys.Add("AzureSpeech:ApiKey");
        requiredKeys.Add("AzureSpeech:Region");
    }
    else
    {
        requiredKeys.Add("AzureOpenAIWhisper:ApiKey");
        requiredKeys.Add("AzureOpenAIWhisper:Endpoint");
        requiredKeys.Add("AzureOpenAIWhisper:DeploymentName");
    }
    StartupConfigValidator.ValidateRequiredConfig(builder.Configuration, requiredKeys);
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
builder.Services.AddHttpClient("AzureOpenAIWhisper", client =>
{
    var apiKey = builder.Configuration["AzureOpenAIWhisper:ApiKey"] ?? "";
    client.DefaultRequestHeaders.Add("api-key", apiKey);
    client.Timeout = TimeSpan.FromSeconds(120);
});
builder.Services.AddScoped<IClaudeClient, ClaudeApiClient>();
builder.Services.AddSingleton<ISectionProfileService, SectionProfileService>();
builder.Services.AddSingleton<IPedagogyConfigService, PedagogyConfigService>();
builder.Services.AddSingleton<IContentSchemaService, ContentSchemaService>();
builder.Services.AddSingleton<IGrammarValidationService, GrammarValidationService>();
builder.Services.AddSingleton<IContentValidationService, ContentValidationService>();
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
builder.Services.Configure<AzureOpenAIWhisperOptions>(builder.Configuration.GetSection(AzureOpenAIWhisperOptions.SectionName));

if (builder.Environment.IsEnvironment("E2ETesting") || builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddScoped<ITranscriptionService, StubTranscriptionService>();
}
else
{
    var activeProvider = builder.Configuration["Transcription:Provider"] ?? "AzureOpenAIWhisper";
    if (activeProvider == "AzureSpeech")
        builder.Services.AddScoped<ITranscriptionService, AzureSpeechTranscriptionService>();
    else
        builder.Services.AddScoped<ITranscriptionService, WhisperTranscriptionService>();
}

builder.Services.AddSingleton<VoiceNoteBlobStorage>();
builder.Services.AddSingleton<IVoiceNoteBlobStorage>(sp => sp.GetRequiredService<VoiceNoteBlobStorage>());
builder.Services.AddScoped<IVoiceNoteService, VoiceNoteService>();
builder.Services.AddScoped<ILessonService, LessonService>();
builder.Services.AddScoped<ILessonNoteService, LessonNoteService>();
if (builder.Environment.IsEnvironment("E2ETesting") || builder.Environment.IsEnvironment("Testing"))
    builder.Services.AddScoped<IReflectionExtractionService, StubReflectionExtractionService>();
else
    builder.Services.AddScoped<IReflectionExtractionService, ReflectionExtractionService>();
if (builder.Environment.IsEnvironment("E2ETesting") || builder.Environment.IsEnvironment("Testing"))
    builder.Services.AddScoped<IStudentProfileExtractionService, StubStudentProfileExtractionService>();
else
    builder.Services.AddScoped<IStudentProfileExtractionService, StudentProfileExtractionService>();
if (builder.Environment.IsEnvironment("E2ETesting") || builder.Environment.IsEnvironment("Testing"))
    builder.Services.AddScoped<IReplanSuggestionService, StubReplanSuggestionService>();
else
    builder.Services.AddScoped<IReplanSuggestionService, ReplanSuggestionService>();
builder.Services.AddScoped<IDifficultyTrendService, DifficultyTrendService>();
builder.Services.AddScoped<ISessionLogService, SessionLogService>();
builder.Services.AddScoped<ITeacherFollowupService, TeacherFollowupService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IProgressService, ProgressService>();
builder.Services.AddScoped<ISessionHistoryService, SessionHistoryService>();
builder.Services.AddScoped<ICurriculumGenerationService, CurriculumGenerationService>();
builder.Services.AddScoped<ICurriculumValidationService, CurriculumValidationService>();
builder.Services.AddSingleton<ICurriculumTemplateService, CurriculumTemplateService>();
builder.Services.AddSingleton<ISessionMappingService, SessionMappingService>();

QuestPDF.Settings.License = LicenseType.Community;
builder.Services.AddScoped<IPdfExportService, PdfExportService>();

builder.Services.AddMemoryCache();
builder.Services.Configure<TelegramOptions>(builder.Configuration.GetSection(TelegramOptions.SectionName));
builder.Services.AddHttpClient("Telegram", (sp, client) =>
{
    var token = sp.GetRequiredService<IOptions<TelegramOptions>>().Value.BotToken;
    client.BaseAddress = new Uri($"https://api.telegram.org/bot{token}/");
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddSingleton<ITelegramStateStore, TelegramStateStore>();
if (builder.Environment.IsEnvironment("E2ETesting") || builder.Environment.IsEnvironment("Testing"))
    builder.Services.AddScoped<ITelegramBotService, StubTelegramBotService>();
else
    builder.Services.AddScoped<ITelegramBotService, TelegramBotService>();
builder.Services.AddScoped<ITelegramConversationService, TelegramConversationService>();

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

// Scenario seed: dotnet LangTeach.Api.dll --seed-scenario <1-6> <auth0-user-id|email>
var seedScenarioIndex = Array.IndexOf(args, "--seed-scenario");
if (seedScenarioIndex >= 0)
{
    var scenarioStr  = seedScenarioIndex + 1 < args.Length ? args[seedScenarioIndex + 1] : null;
    var teacherArg   = seedScenarioIndex + 2 < args.Length ? args[seedScenarioIndex + 2] : null;

    if (!int.TryParse(scenarioStr, out var scenario) || scenario < 1 || scenario > 7)
    {
        Console.Error.WriteLine("Usage: --seed-scenario <1-7> <auth0-user-id|email>");
        return 1;
    }
    if (string.IsNullOrWhiteSpace(teacherArg))
    {
        Console.Error.WriteLine("Usage: --seed-scenario <1-7> <auth0-user-id|email>");
        return 1;
    }

    using var scenarioScope  = app.Services.CreateScope();
    var scenarioDb     = scenarioScope.ServiceProvider.GetRequiredService<AppDbContext>();
    var scenarioLogger = scenarioScope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var seeded = await ScenarioSeeder.SeedScenarioAsync(scenarioDb, scenario, teacherArg, scenarioLogger);
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

// QA seed: dotnet LangTeach.Api.dll --qa-seed <auth0-user-id|email>
// Idempotent. Ensures the QA teacher is SubscriptionTier=Pro, IsApproved, HasCompletedOnboarding.
// Run this after each QA stack start (including after volume resets) to prevent Free tier limits.
var qaSeedIndex = Array.IndexOf(args, "--qa-seed");
if (qaSeedIndex >= 0)
{
    var teacherLookup = (qaSeedIndex + 1 < args.Length ? args[qaSeedIndex + 1] : null)?.Trim();
    if (string.IsNullOrWhiteSpace(teacherLookup))
    {
        Console.Error.WriteLine("Usage: --qa-seed <auth0-user-id|email>");
        return 1;
    }

    using var qaSeedScope = app.Services.CreateScope();
    var qaSeedDb     = qaSeedScope.ServiceProvider.GetRequiredService<AppDbContext>();
    var qaSeedLogger = qaSeedScope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var teacher = teacherLookup.StartsWith("auth0|", StringComparison.OrdinalIgnoreCase)
        ? await qaSeedDb.Teachers.FirstOrDefaultAsync(t => t.Auth0UserId == teacherLookup)
        : await qaSeedDb.Teachers.FirstOrDefaultAsync(t => t.Email == teacherLookup);
    if (teacher is null)
    {
        qaSeedLogger.LogError("--qa-seed: no teacher found for '{Lookup}'. Log in at least once before seeding.", teacherLookup);
        return 1;
    }
    teacher.SubscriptionTier       = LangTeach.Api.Data.Models.SubscriptionTier.Pro;
    teacher.IsApproved              = true;
    teacher.HasCompletedOnboarding  = true;
    teacher.UpdatedAt               = DateTime.UtcNow;
    await qaSeedDb.SaveChangesAsync();
    qaSeedLogger.LogInformation("--qa-seed: teacher {Email} set to Pro/approved.", teacher.Email);
    return 0;
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
