using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCorrections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Corrections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeacherId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LessonId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SessionLogId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SchemaVersion = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pendiente"),
                    AssignmentTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AssignmentPrompt = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    StudentText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MarkedUpOutput = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CorrectedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Corrections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Corrections_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Corrections_SessionLogs_SessionLogId",
                        column: x => x.SessionLogId,
                        principalTable: "SessionLogs",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Corrections_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Corrections_Teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CorrectionTags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CorrectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    SpannedText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    StartIndex = table.Column<int>(type: "int", nullable: false),
                    EndIndex = table.Column<int>(type: "int", nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CorrectedForm = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    OrderIndex = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorrectionTags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CorrectionTags_Corrections_CorrectionId",
                        column: x => x.CorrectionId,
                        principalTable: "Corrections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Corrections_LessonId",
                table: "Corrections",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_Corrections_SessionLogId",
                table: "Corrections",
                column: "SessionLogId");

            migrationBuilder.CreateIndex(
                name: "IX_Corrections_StudentId_DeletedAt",
                table: "Corrections",
                columns: new[] { "StudentId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Corrections_TeacherId_DeletedAt",
                table: "Corrections",
                columns: new[] { "TeacherId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CorrectionTags_CorrectionId_Category",
                table: "CorrectionTags",
                columns: new[] { "CorrectionId", "Category" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CorrectionTags");

            migrationBuilder.DropTable(
                name: "Corrections");
        }
    }
}
