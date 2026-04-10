using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class StudentFieldsSplit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add new columns
            migrationBuilder.AddColumn<string>(
                name: "NativeLanguages",
                table: "Students",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "PersonalNotes",
                table: "Students",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TeachingNotes",
                table: "Students",
                type: "nvarchar(max)",
                nullable: true);

            // 2. Copy data before dropping old columns.
            // Use CONCAT instead of JSON_ARRAY() to stay compatible with Azure SQL tiers below SQL Server 2022.
            migrationBuilder.Sql("""
                UPDATE Students
                SET PersonalNotes = Notes,
                    NativeLanguages = CASE
                        WHEN NativeLanguage IS NULL THEN '[]'
                        ELSE CONCAT('["', REPLACE(NativeLanguage, '"', '\"'), '"]')
                    END;
                """);

            // 3. Drop old columns
            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "NativeLanguage",
                table: "Students");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Re-add old columns
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Students",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NativeLanguage",
                table: "Students",
                type: "nvarchar(max)",
                nullable: true);

            // Restore data: PersonalNotes -> Notes, first element of NativeLanguages -> NativeLanguage
            migrationBuilder.Sql("""
                UPDATE Students
                SET Notes = PersonalNotes,
                    NativeLanguage = CASE
                        WHEN NativeLanguages = '[]' THEN NULL
                        ELSE JSON_VALUE(NativeLanguages, '$[0]')
                    END;
                """);

            // Drop new columns
            migrationBuilder.DropColumn(
                name: "NativeLanguages",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PersonalNotes",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "TeachingNotes",
                table: "Students");
        }
    }
}
