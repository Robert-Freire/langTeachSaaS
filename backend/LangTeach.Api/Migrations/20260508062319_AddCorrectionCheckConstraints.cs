using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCorrectionCheckConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_CorrectionTags_Category",
                table: "CorrectionTags",
                sql: "Category COLLATE Latin1_General_100_BIN2 IN ('C', 'G', 'L', 'O', 'MuyBien')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CorrectionTags_Span",
                table: "CorrectionTags",
                sql: "[StartIndex] >= 0 AND [EndIndex] >= [StartIndex]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Corrections_Status",
                table: "Corrections",
                sql: "Status COLLATE Latin1_General_100_BIN2 IN ('Pendiente', 'Entregada', 'Corregida')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CorrectionTags_Category",
                table: "CorrectionTags");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CorrectionTags_Span",
                table: "CorrectionTags");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Corrections_Status",
                table: "Corrections");
        }
    }
}
