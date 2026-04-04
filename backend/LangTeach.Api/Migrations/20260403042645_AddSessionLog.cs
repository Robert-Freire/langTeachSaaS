using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SessionLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeacherId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PlannedContent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ActualContent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HomeworkAssigned = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreviousHomeworkStatus = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    NextSessionTopics = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GeneralNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LevelReassessmentSkill = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LevelReassessmentLevel = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LinkedLessonId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionLogs_Lessons_LinkedLessonId",
                        column: x => x.LinkedLessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SessionLogs_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SessionLogs_Teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_SessionLogs_LinkedLessonId",
                table: "SessionLogs",
                column: "LinkedLessonId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionLogs_StudentId_SessionDate",
                table: "SessionLogs",
                columns: new[] { "StudentId", "SessionDate" });

            migrationBuilder.CreateIndex(
                name: "IX_SessionLogs_TeacherId",
                table: "SessionLogs",
                column: "TeacherId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessionLogs");
        }
    }
}
