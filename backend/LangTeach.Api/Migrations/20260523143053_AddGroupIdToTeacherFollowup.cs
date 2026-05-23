using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupIdToTeacherFollowup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GroupId",
                table: "TeacherFollowups",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeacherFollowups_GroupId_Kind",
                table: "TeacherFollowups",
                columns: new[] { "GroupId", "Kind" });

            migrationBuilder.AddForeignKey(
                name: "FK_TeacherFollowups_Groups_GroupId",
                table: "TeacherFollowups",
                column: "GroupId",
                principalTable: "Groups",
                principalColumn: "Id");

            // Add XOR scope constraint: exactly one of StudentId or GroupId must be non-null.
            migrationBuilder.Sql(
                "ALTER TABLE [TeacherFollowups] ADD CONSTRAINT [CK_TeacherFollowups_Scope] " +
                "CHECK (([StudentId] IS NULL AND [GroupId] IS NOT NULL) OR ([StudentId] IS NOT NULL AND [GroupId] IS NULL));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TeacherFollowups_Groups_GroupId",
                table: "TeacherFollowups");

            migrationBuilder.DropIndex(
                name: "IX_TeacherFollowups_GroupId_Kind",
                table: "TeacherFollowups");

            migrationBuilder.Sql(
                "ALTER TABLE [TeacherFollowups] DROP CONSTRAINT [CK_TeacherFollowups_Scope]");

            migrationBuilder.DropColumn(
                name: "GroupId",
                table: "TeacherFollowups");
        }
    }
}
