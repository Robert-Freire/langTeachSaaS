using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAssistantTurnFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AssistantTurnFeedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeacherId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VoiceNoteId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SessionLogId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Rating = table.Column<string>(type: "nvarchar(4)", maxLength: 4, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ProposalsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssistantTurnFeedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssistantTurnFeedbacks_Teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AssistantTurnFeedbacks_VoiceNotes_VoiceNoteId",
                        column: x => x.VoiceNoteId,
                        principalTable: "VoiceNotes",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssistantTurnFeedbacks_TeacherId",
                table: "AssistantTurnFeedbacks",
                column: "TeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_AssistantTurnFeedbacks_VoiceNoteId_TeacherId",
                table: "AssistantTurnFeedbacks",
                columns: new[] { "VoiceNoteId", "TeacherId" },
                unique: true,
                filter: "[VoiceNoteId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssistantTurnFeedbacks");
        }
    }
}
