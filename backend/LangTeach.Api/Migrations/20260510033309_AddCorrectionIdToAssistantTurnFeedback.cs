using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCorrectionIdToAssistantTurnFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CorrectionId",
                table: "AssistantTurnFeedbacks",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssistantTurnFeedbacks_CorrectionId_TeacherId",
                table: "AssistantTurnFeedbacks",
                columns: new[] { "CorrectionId", "TeacherId" },
                unique: true,
                filter: "[CorrectionId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_AssistantTurnFeedbacks_Corrections_CorrectionId",
                table: "AssistantTurnFeedbacks",
                column: "CorrectionId",
                principalTable: "Corrections",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AssistantTurnFeedbacks_Corrections_CorrectionId",
                table: "AssistantTurnFeedbacks");

            migrationBuilder.DropIndex(
                name: "IX_AssistantTurnFeedbacks_CorrectionId_TeacherId",
                table: "AssistantTurnFeedbacks");

            migrationBuilder.DropColumn(
                name: "CorrectionId",
                table: "AssistantTurnFeedbacks");
        }
    }
}
