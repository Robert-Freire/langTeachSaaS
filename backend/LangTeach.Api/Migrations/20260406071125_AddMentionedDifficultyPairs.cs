using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMentionedDifficultyPairs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MentionedDifficultyPairs",
                table: "SessionLogs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            // Reset existing Difficulties JSON to empty array — field names have changed
            // (Category→Competency, Item→Description) and existing entries have no real data to protect.
            migrationBuilder.Sql("UPDATE Students SET Difficulties = '[]' WHERE Difficulties != '[]'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MentionedDifficultyPairs",
                table: "SessionLogs");
        }
    }
}
