using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTeacherFollowups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TeacherFollowups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeacherId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Text = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(450)", nullable: false, defaultValue: "pending"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SourceSessionLogId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeacherFollowups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeacherFollowups_SessionLogs_SourceSessionLogId",
                        column: x => x.SourceSessionLogId,
                        principalTable: "SessionLogs",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TeacherFollowups_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TeacherFollowups_Teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TeacherFollowups_SourceSessionLogId",
                table: "TeacherFollowups",
                column: "SourceSessionLogId");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherFollowups_StudentId",
                table: "TeacherFollowups",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherFollowups_TeacherId_Status",
                table: "TeacherFollowups",
                columns: new[] { "TeacherId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TeacherFollowups_TeacherId_StudentId",
                table: "TeacherFollowups",
                columns: new[] { "TeacherId", "StudentId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TeacherFollowups");
        }
    }
}
