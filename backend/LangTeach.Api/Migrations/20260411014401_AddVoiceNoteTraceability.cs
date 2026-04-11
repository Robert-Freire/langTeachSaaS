using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVoiceNoteTraceability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RawExtractionJson",
                table: "SessionLogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VoiceNoteId",
                table: "SessionLogs",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SessionLogs_VoiceNoteId",
                table: "SessionLogs",
                column: "VoiceNoteId");

            migrationBuilder.AddForeignKey(
                name: "FK_SessionLogs_VoiceNotes_VoiceNoteId",
                table: "SessionLogs",
                column: "VoiceNoteId",
                principalTable: "VoiceNotes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SessionLogs_VoiceNotes_VoiceNoteId",
                table: "SessionLogs");

            migrationBuilder.DropIndex(
                name: "IX_SessionLogs_VoiceNoteId",
                table: "SessionLogs");

            migrationBuilder.DropColumn(
                name: "RawExtractionJson",
                table: "SessionLogs");

            migrationBuilder.DropColumn(
                name: "VoiceNoteId",
                table: "SessionLogs");
        }
    }
}
