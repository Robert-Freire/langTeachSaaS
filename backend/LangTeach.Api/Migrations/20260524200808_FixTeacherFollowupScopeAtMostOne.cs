using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixTeacherFollowupScopeAtMostOne : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TeacherFollowups_Scope",
                table: "TeacherFollowups");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TeacherFollowups_Scope",
                table: "TeacherFollowups",
                sql: "[StudentId] IS NULL OR [GroupId] IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TeacherFollowups_Scope",
                table: "TeacherFollowups");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TeacherFollowups_Scope",
                table: "TeacherFollowups",
                sql: "([StudentId] IS NULL) <> ([GroupId] IS NULL)");
        }
    }
}
