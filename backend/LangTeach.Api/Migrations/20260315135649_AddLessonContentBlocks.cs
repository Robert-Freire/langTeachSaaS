using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLessonContentBlocks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LessonContentBlocks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LessonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LessonSectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BlockType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    GeneratedContent = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EditedContent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GenerationParams = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonContentBlocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LessonContentBlocks_LessonSections_LessonSectionId",
                        column: x => x.LessonSectionId,
                        principalTable: "LessonSections",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LessonContentBlocks_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LessonContentBlocks_LessonId",
                table: "LessonContentBlocks",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonContentBlocks_LessonSectionId",
                table: "LessonContentBlocks",
                column: "LessonSectionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LessonContentBlocks");
        }
    }
}
