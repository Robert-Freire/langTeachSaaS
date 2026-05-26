using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCorrectionTagFilterStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FilterStatus",
                table: "CorrectionTags",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "kept");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CorrectionTags_FilterStatus",
                table: "CorrectionTags",
                sql: "FilterStatus COLLATE Latin1_General_100_BIN2 IN ('kept', 'removed')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CorrectionTags_FilterStatus",
                table: "CorrectionTags");

            migrationBuilder.DropColumn(
                name: "FilterStatus",
                table: "CorrectionTags");
        }
    }
}
