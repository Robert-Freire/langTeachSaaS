using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTeacherHasCompletedOnboarding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasCompletedOnboarding",
                table: "Teachers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // Mark all existing teachers as onboarded so they skip the wizard
            migrationBuilder.Sql("UPDATE Teachers SET HasCompletedOnboarding = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasCompletedOnboarding",
                table: "Teachers");
        }
    }
}
