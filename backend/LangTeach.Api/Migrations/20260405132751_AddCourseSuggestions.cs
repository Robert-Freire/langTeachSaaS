using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseSuggestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CourseSuggestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CourseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CurriculumEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ProposedChange = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Reasoning = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "pending"),
                    TeacherEdit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RespondedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseSuggestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseSuggestions_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CourseSuggestions_CurriculumEntries_CurriculumEntryId",
                        column: x => x.CurriculumEntryId,
                        principalTable: "CurriculumEntries",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CourseSuggestions_CourseId",
                table: "CourseSuggestions",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseSuggestions_CurriculumEntryId",
                table: "CourseSuggestions",
                column: "CurriculumEntryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CourseSuggestions");
        }
    }
}
