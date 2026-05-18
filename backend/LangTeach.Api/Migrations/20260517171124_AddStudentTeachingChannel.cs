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

            migrationBuilder.AddCheckConstraint(
                name: "CK_Students_TeachingChannel",
                table: "Students",
                sql: "[TeachingChannel] IS NULL OR [TeachingChannel] IN (1, 2, 3)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Students_TeachingChannel",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "TeachingChannel",
                table: "Students");
        }
    }
}
