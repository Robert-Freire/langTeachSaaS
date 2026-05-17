using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class HardenCorrectionEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Corrections_StudentId_DeletedAt",
                table: "Corrections");

            migrationBuilder.DropIndex(
                name: "IX_Corrections_TeacherId_DeletedAt",
                table: "Corrections");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Corrections");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Corrections",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Corrections",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateIndex(
                name: "IX_Corrections_StudentId_IsDeleted",
                table: "Corrections",
                columns: new[] { "StudentId", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_Corrections_TeacherId_IsDeleted",
                table: "Corrections",
                columns: new[] { "TeacherId", "IsDeleted" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Corrections_StudentId_IsDeleted",
                table: "Corrections");

            migrationBuilder.DropIndex(
                name: "IX_Corrections_TeacherId_IsDeleted",
                table: "Corrections");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Corrections");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Corrections");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Corrections",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Corrections_StudentId_DeletedAt",
                table: "Corrections",
                columns: new[] { "StudentId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Corrections_TeacherId_DeletedAt",
                table: "Corrections",
                columns: new[] { "TeacherId", "DeletedAt" });
        }
    }
}
