using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionLogModelGaps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SessionLogs_TeacherId",
                table: "SessionLogs");

            migrationBuilder.AddColumn<string>(
                name: "SkillLevelOverrides",
                table: "Students",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "SessionLogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TopicTags",
                table: "SessionLogs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.CreateIndex(
                name: "IX_SessionLogs_TeacherId_IsDeleted",
                table: "SessionLogs",
                columns: new[] { "TeacherId", "IsDeleted" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SessionLogs_TeacherId_IsDeleted",
                table: "SessionLogs");

            migrationBuilder.DropColumn(
                name: "SkillLevelOverrides",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "SessionLogs");

            migrationBuilder.DropColumn(
                name: "TopicTags",
                table: "SessionLogs");

            migrationBuilder.CreateIndex(
                name: "IX_SessionLogs_TeacherId",
                table: "SessionLogs",
                column: "TeacherId");
        }
    }
}
