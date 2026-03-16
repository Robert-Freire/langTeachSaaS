using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueEmailIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Teachers",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            // Fail fast if non-empty duplicate emails already exist — requires manual deduplication before deploying
            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1
                    FROM Teachers
                    WHERE Email <> ''
                    GROUP BY Email
                    HAVING COUNT(*) > 1
                )
                THROW 50001, 'Cannot create unique index IX_Teachers_Email: duplicate non-empty Teacher.Email values exist.', 1;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Teachers_Email",
                table: "Teachers",
                column: "Email",
                unique: true,
                filter: "[Email] <> ''");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Teachers_Email",
                table: "Teachers");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Teachers",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
