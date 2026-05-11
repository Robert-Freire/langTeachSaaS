using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCorrigiendoStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Corrections_Status",
                table: "Corrections");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Corrections_Status",
                table: "Corrections",
                sql: "Status COLLATE Latin1_General_100_BIN2 IN ('Pendiente', 'Entregada', 'Corrigiendo', 'Corregida')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Corrections_Status",
                table: "Corrections");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Corrections_Status",
                table: "Corrections",
                sql: "Status COLLATE Latin1_General_100_BIN2 IN ('Pendiente', 'Entregada', 'Corregida')");
        }
    }
}
