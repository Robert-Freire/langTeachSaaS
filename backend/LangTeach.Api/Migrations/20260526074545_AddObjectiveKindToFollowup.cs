using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddObjectiveKindToFollowup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TeacherFollowups_Kind",
                table: "TeacherFollowups");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TeacherFollowups_Kind",
                table: "TeacherFollowups",
                sql: "Kind COLLATE Latin1_General_100_BIN2 IN ('pedagogical', 'operational', 'objective')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TeacherFollowups_Kind",
                table: "TeacherFollowups");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TeacherFollowups_Kind",
                table: "TeacherFollowups",
                sql: "Kind COLLATE Latin1_General_100_BIN2 IN ('pedagogical', 'operational')");
        }
    }
}
