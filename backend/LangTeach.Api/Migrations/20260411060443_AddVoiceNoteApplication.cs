using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVoiceNoteApplication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VoiceNoteApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionLogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VoiceNoteId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Transcription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RawExtractionJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ApplicationType = table.Column<int>(type: "int", nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VoiceNoteApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VoiceNoteApplications_SessionLogs_SessionLogId",
                        column: x => x.SessionLogId,
                        principalTable: "SessionLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VoiceNoteApplications_VoiceNotes_VoiceNoteId",
                        column: x => x.VoiceNoteId,
                        principalTable: "VoiceNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VoiceNoteApplications_SessionLogId",
                table: "VoiceNoteApplications",
                column: "SessionLogId");

            migrationBuilder.CreateIndex(
                name: "IX_VoiceNoteApplications_VoiceNoteId",
                table: "VoiceNoteApplications",
                column: "VoiceNoteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VoiceNoteApplications");
        }
    }
}
