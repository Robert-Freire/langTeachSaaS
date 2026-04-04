using ClosedXML.Excel;
using FluentAssertions;
using LangTeach.MigrationTool;

namespace LangTeach.MigrationTool.Tests;

public class ExcelImporterTests
{
    // Helper: build an in-memory worksheet with a header row and data rows in column F
    private static IXLWorksheet BuildWorksheet(params string[] columnFValues)
    {
        var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Test");
        ws.Cell(1, 6).Value = "test Preply"; // header row
        for (int i = 0; i < columnFValues.Length; i++)
            ws.Cell(i + 2, 6).Value = columnFValues[i];
        return ws;
    }

    [Fact]
    public void ExtractLevelFromColumnF_FirstNonEmpty_ReturnsNormalisedLevel()
    {
        var ws = BuildWorksheet("C1");
        ExcelImporter.ExtractLevelFromColumnF(ws).Should().Be("C1");
    }

    [Fact]
    public void ExtractLevelFromColumnF_PrefixedValue_ReturnsExtractedLevel()
    {
        var ws = BuildWorksheet("Preply A2");
        ExcelImporter.ExtractLevelFromColumnF(ws).Should().Be("A2");
    }

    [Fact]
    public void ExtractLevelFromColumnF_PlusLevel_ReturnsBaseBand()
    {
        var ws = BuildWorksheet("B1+");
        ExcelImporter.ExtractLevelFromColumnF(ws).Should().Be("B1");
    }

    [Fact]
    public void ExtractLevelFromColumnF_A0Plus_MapsToA1()
    {
        var ws = BuildWorksheet("A0+");
        ExcelImporter.ExtractLevelFromColumnF(ws).Should().Be("A1");
    }

    [Fact]
    public void ExtractLevelFromColumnF_SkipsEmptyRows_ReturnsFirstNonEmpty()
    {
        var ws = BuildWorksheet("", "", "B2");
        ExcelImporter.ExtractLevelFromColumnF(ws).Should().Be("B2");
    }

    [Fact]
    public void ExtractLevelFromColumnF_AllEmpty_ReturnsNull()
    {
        var ws = BuildWorksheet("", "");
        ExcelImporter.ExtractLevelFromColumnF(ws).Should().BeNull();
    }

    [Fact]
    public void ExtractLevelFromColumnF_NoDataRows_ReturnsNull()
    {
        var ws = BuildWorksheet(); // only header
        ExcelImporter.ExtractLevelFromColumnF(ws).Should().BeNull();
    }
}
