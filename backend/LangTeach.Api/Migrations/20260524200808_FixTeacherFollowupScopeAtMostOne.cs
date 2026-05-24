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

            // Reverting to XOR re-forbids teacher-level (unscoped) followups. If any rows
            // with both StudentId and GroupId NULL exist, this AddCheckConstraint fails
            // (SQL 547) by design: an "exactly-one" invariant cannot be restored once
            // "neither" rows legitimately exist. Roll back only against data predating such
            // rows. See #1356.
            migrationBuilder.AddCheckConstraint(
                name: "CK_TeacherFollowups_Scope",
                table: "TeacherFollowups",
                sql: "([StudentId] IS NULL) <> ([GroupId] IS NULL)");
        }
    }
}
