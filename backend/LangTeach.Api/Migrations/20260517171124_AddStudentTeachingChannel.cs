using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentTeachingChannel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TeachingChannel",
                table: "Students",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TeachingChannel",
                table: "Students");
        }
    }
}
