using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVoiceNote : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VoiceNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeacherId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BlobPath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    DurationSeconds = table.Column<int>(type: "int", nullable: false),
                    Transcription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TranscribedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VoiceNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VoiceNotes_Teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VoiceNotes_TeacherId_CreatedAt",
                table: "VoiceNotes",
                columns: new[] { "TeacherId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VoiceNotes");
        }
    }
}
