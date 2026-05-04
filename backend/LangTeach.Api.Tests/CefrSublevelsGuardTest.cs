using System.Text.RegularExpressions;
using FluentAssertions;

namespace LangTeach.Api.Tests;

/// <summary>
/// Prevents sublevel (B2.1) or plus (B2+) CEFR notation from entering source files.
/// Files that intentionally handle sublevel input for normalization are explicitly excluded.
/// </summary>
public class CefrSublevelsGuardTest
{
    // These files intentionally handle sublevel input from teacher speech or external curricula.
    private static readonly HashSet<string> ExcludedFiles = new(StringComparer.OrdinalIgnoreCase)
    {
        "CefrConstants.cs",                 // canonical source -- doc comment deliberately names invalid forms
        "CefrLevelNormalizer.cs",           // normalization helper -- intentionally handles sublevel input
        "SessionLogService.cs",             // normalization helper -- intentionally handles sublevel input
        "StudentProfileExtractionService.cs", // accepts sublevel AI output before normalization
        "CurriculumTemplateService.cs",     // loads curriculum JSON files that use sublevel resource names
        "CefrSublevelsGuardTest.cs",
        "cefrUtils.ts",                     // normalization helper -- intentionally handles sublevel input
        "LogSession.tsx",                   // intentional UI feature: per-skill sublevel level tracking
    };


    // Matches "B2.1", "B1.2", "A1+" etc. but NOT SVG coordinate data like "A1.125" (followed by more digits).
    private static readonly Regex SublevelsPattern = new(
        @"(A1|A2|B1|B2|C1|C2)(\.[12](?!\d)|\+)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    [Fact]
    public void NoCefrSublevelsInSourceFiles()
    {
        var repoRoot = FindRepoRoot(AppContext.BaseDirectory);
        repoRoot.Should().NotBeNull("could not locate repository root (no .git directory found)");

        var violations = new List<string>();

        // Guard production code only. Test files may legitimately exercise normalization paths
        // (e.g. passing "B1.2" to verify the normalizer converts it to "B1").
        // The MigrationTool is a standalone ETL that intentionally handles sublevel input.
        ScanDirectory(Path.Combine(repoRoot!, "backend", "LangTeach.Api"), "*.cs", violations);
        ScanDirectory(Path.Combine(repoRoot!, "frontend", "src"), "*.ts", violations);
        ScanDirectory(Path.Combine(repoRoot!, "frontend", "src"), "*.tsx", violations);

        violations.Should().BeEmpty(
            "sublevel CEFR notation (e.g. B2.1, B2+) must not appear in source files. " +
            "Use only A1, A2, B1, B2, C1, or C2. See CefrConstants.cs and docs/design-system.md.");
    }

    private void ScanDirectory(string dir, string searchPattern, List<string> violations)
    {
        if (!Directory.Exists(dir)) return;

        foreach (var file in Directory.EnumerateFiles(dir, searchPattern, SearchOption.AllDirectories))
        {
            var fileName = Path.GetFileName(file);
            if (ExcludedFiles.Contains(fileName)) continue;
            // Skip test files — they may legitimately exercise normalization paths.
            if (fileName.Contains(".test.") || fileName.Contains(".spec.")) continue;

            var lines = File.ReadAllLines(file);
            for (var i = 0; i < lines.Length; i++)
            {
                if (SublevelsPattern.IsMatch(lines[i]))
                    violations.Add($"{file}:{i + 1}: {lines[i].Trim()}");
            }
        }
    }

    private static string? FindRepoRoot(string startDir)
    {
        var dir = new DirectoryInfo(startDir);
        while (dir != null)
        {
            var gitPath = Path.Combine(dir.FullName, ".git");
            // Accept .git as directory (main worktree) or file (linked worktree).
            if (Directory.Exists(gitPath) || File.Exists(gitPath))
                return dir.FullName;
            dir = dir.Parent;
        }
        return null;
    }
}
