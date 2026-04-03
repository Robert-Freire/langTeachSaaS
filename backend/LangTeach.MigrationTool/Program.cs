using LangTeach.Api.Data;
using LangTeach.MigrationTool;
using Microsoft.EntityFrameworkCore;

// Argument parsing
string? filePath = null;
string? connectionString = null;
Guid? teacherId = null;
bool dryRun = false;

for (int i = 0; i < args.Length; i++)
{
    switch (args[i])
    {
        case "--file" when i + 1 < args.Length:
            if (args[i + 1].StartsWith("--", StringComparison.Ordinal)) { Console.Error.WriteLine("ERROR: --file requires a value"); return 1; }
            filePath = args[++i];
            break;
        case "--connection" when i + 1 < args.Length:
            if (args[i + 1].StartsWith("--", StringComparison.Ordinal)) { Console.Error.WriteLine("ERROR: --connection requires a value"); return 1; }
            connectionString = args[++i];
            break;
        case "--teacher-id" when i + 1 < args.Length:
            if (args[i + 1].StartsWith("--", StringComparison.Ordinal)) { Console.Error.WriteLine("ERROR: --teacher-id requires a GUID value"); return 1; }
            if (!Guid.TryParse(args[++i], out var tid))
            {
                Console.Error.WriteLine("ERROR: --teacher-id must be a valid GUID");
                return 1;
            }
            teacherId = tid;
            break;
        case "--dry-run":
            dryRun = true;
            break;
        default:
            Console.Error.WriteLine($"ERROR: Unknown argument '{args[i]}'");
            Console.Error.WriteLine("Usage: LangTeach.MigrationTool --file <xlsx> --teacher-id <guid> [--connection <conn>] [--dry-run]");
            return 1;
    }
}

if (filePath is null)
{
    Console.Error.WriteLine("ERROR: --file <path> is required");
    Console.Error.WriteLine("Usage: LangTeach.MigrationTool --file <xlsx> --teacher-id <guid> [--connection <conn>] [--dry-run]");
    return 1;
}

if (!File.Exists(filePath))
{
    Console.Error.WriteLine($"ERROR: File not found: {filePath}");
    return 1;
}

connectionString ??=
    Environment.GetEnvironmentVariable("ConnectionStrings__Default") ??
    Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("ERROR: Database connection string required. Set ConnectionStrings__Default or use --connection");
    return 1;
}

if (teacherId is null)
{
    var teacherIdEnv = Environment.GetEnvironmentVariable("MIGRATION_TEACHER_ID");
    if (Guid.TryParse(teacherIdEnv, out var envTid))
        teacherId = envTid;
}

if (teacherId is null)
{
    Console.Error.WriteLine("ERROR: --teacher-id <guid> is required (or set MIGRATION_TEACHER_ID env var)");
    return 1;
}

if (dryRun)
    Console.WriteLine("*** DRY RUN MODE — no changes will be written to the database ***");

Console.WriteLine($"File: {filePath}");
Console.WriteLine($"Teacher ID: {teacherId}");
Console.WriteLine($"Mode: {(dryRun ? "dry-run" : "live")}");
Console.WriteLine();

var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseSqlServer(connectionString)
    .Options;

ImportResult result;
try
{
    await using var db = new AppDbContext(options);
    var importer = new ExcelImporter(db, teacherId.Value, dryRun);
    result = await importer.ImportAsync(filePath);
}
catch (Exception ex)
{
    Console.Error.WriteLine($"ERROR: Import failed: {ex.Message}");
    return 1;
}

Console.WriteLine();
Console.WriteLine("=== Summary ===");
Console.WriteLine($"Sheets processed : {result.SheetsProcessed}");
Console.WriteLine($"Sheets matched   : {result.SheetsMatched}");
Console.WriteLine($"Sheets unmatched : {result.SheetsUnmatched}");
Console.WriteLine($"Sessions imported: {result.SessionsImported}");
Console.WriteLine($"Sessions skipped : {result.SessionsSkipped} (duplicates)");
Console.WriteLine($"Student notes    : {result.StudentsNotesUpdated} updated");

if (dryRun)
    Console.WriteLine("\n*** DRY RUN — no data was written ***");

return 0;
