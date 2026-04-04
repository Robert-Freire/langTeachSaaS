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

    // Helpers for TryParseDate tests
    private static IXLCell BuildNumericCell(double value)
    {
        var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Test");
        var cell = ws.Cell(1, 1);
        cell.Value = value;
        return cell;
    }

    private static IXLCell BuildTextCell(string text)
    {
        var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Test");
        var cell = ws.Cell(1, 1);
        cell.Value = text;
        return cell;
    }

    private static IXLCell BuildDateTimeCell(DateTime dt)
    {
        var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Test");
        var cell = ws.Cell(1, 1);
        cell.Value = dt;
        return cell;
    }

    // --- TryParseDate: OA date numeric path ---

    [Theory]
    [InlineData(45315.0, 2024, 1, 24)]   // Jan 24, 2024 — OA date for a real Jordi session date
    [InlineData(45344.0, 2024, 2, 22)]   // Feb 22, 2024 — OA date for a real Jordi session date
    [InlineData(45681.0, 2025, 1, 24)]   // Jan 24, 2025 (366 days after Jan 24, 2024 — 2024 is a leap year)
    [InlineData(36526.0, 2000, 1, 1)]    // Jan 1, 2000 — lower bound of expected range
    [InlineData(38741.0, 2006, 1, 24)]   // OA 38741 = Jan 24, 2006; within range, parsed as-is
    public void TryParseDate_NumericOADate_ParsesCorrectly(double oaValue, int year, int month, int day)
    {
        var cell = BuildNumericCell(oaValue);
        var success = ExcelImporter.TryParseDate(cell, out var result);
        success.Should().BeTrue();
        result.Should().Be(new DateTime(year, month, day));
    }

    [Theory]
    [InlineData(0.0)]    // zero — below valid range
    [InlineData(0.5)]    // fractional below 1 (time-only value)
    [InlineData(50001.0)] // above upper bound
    [InlineData(99999.0)]
    public void TryParseDate_NumericOutOfRange_ReturnsNull(double oaValue)
    {
        var cell = BuildNumericCell(oaValue);
        var success = ExcelImporter.TryParseDate(cell, out _);
        success.Should().BeFalse();
    }

    // --- TryParseDate: DateTime cell path ---

    [Fact]
    public void TryParseDate_DateTimeCell_ReturnsDateOnly()
    {
        var dt = new DateTime(2024, 1, 24, 10, 30, 0); // time component must be stripped
        var cell = BuildDateTimeCell(dt);
        var success = ExcelImporter.TryParseDate(cell, out var result);
        success.Should().BeTrue();
        result.Should().Be(new DateTime(2024, 1, 24));
    }

    [Fact]
    public void TryParseDate_DateTimeCell_Feb2024_ReturnsCorrectDate()
    {
        var cell = BuildDateTimeCell(new DateTime(2024, 2, 22));
        var success = ExcelImporter.TryParseDate(cell, out var result);
        success.Should().BeTrue();
        result.Should().Be(new DateTime(2024, 2, 22));
    }

    // --- TryParseDate: text date path ---

    [Theory]
    [InlineData("2024-01-24", 2024, 1, 24)]
    [InlineData("22/02/2024", 2024, 2, 22)]
    [InlineData("24/01/2024", 2024, 1, 24)]
    [InlineData("01/24/2024", 2024, 1, 24)]   // MM/dd/yyyy (US format)
    [InlineData("24-01-2024", 2024, 1, 24)]
    public void TryParseDate_TextDate_ParsesCorrectly(string text, int year, int month, int day)
    {
        var cell = BuildTextCell(text);
        var success = ExcelImporter.TryParseDate(cell, out var result);
        success.Should().BeTrue();
        result.Should().Be(new DateTime(year, month, day));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-a-date")]
    [InlineData("0")]
    public void TryParseDate_TextInvalid_ReturnsFalse(string text)
    {
        var cell = BuildTextCell(text);
        var success = ExcelImporter.TryParseDate(cell, out _);
        success.Should().BeFalse();
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
