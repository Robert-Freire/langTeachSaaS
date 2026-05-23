using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupDetailFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add TeachingNotes to Groups
            migrationBuilder.AddColumn<string>(
                name: "TeachingNotes",
                table: "Groups",
                type: "nvarchar(max)",
                nullable: true);

            // Add GroupId to TeacherFollowups
            migrationBuilder.AddColumn<Guid>(
                name: "GroupId",
                table: "TeacherFollowups",
                type: "uniqueidentifier",
                nullable: true);

            // FK: TeacherFollowups.GroupId -> Groups.Id (Restrict = no cascade)
            migrationBuilder.AddForeignKey(
                name: "FK_TeacherFollowups_Groups_GroupId",
                table: "TeacherFollowups",
                column: "GroupId",
                principalTable: "Groups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Composite index on (GroupId, Status) filtered to non-null GroupId rows
            migrationBuilder.CreateIndex(
                name: "IX_TeacherFollowups_GroupId_Status",
                table: "TeacherFollowups",
                columns: new[] { "GroupId", "Status" },
                filter: "[GroupId] IS NOT NULL");

            // CHECK constraint: at most one of StudentId or GroupId may be non-null
            migrationBuilder.Sql(
                "ALTER TABLE [TeacherFollowups] ADD CONSTRAINT [CK_TeacherFollowups_Scope] " +
                "CHECK ([StudentId] IS NULL OR [GroupId] IS NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE [TeacherFollowups] DROP CONSTRAINT [CK_TeacherFollowups_Scope]");

            migrationBuilder.DropIndex(
                name: "IX_TeacherFollowups_GroupId_Status",
                table: "TeacherFollowups");

            migrationBuilder.DropForeignKey(
                name: "FK_TeacherFollowups_Groups_GroupId",
                table: "TeacherFollowups");

            migrationBuilder.DropColumn(
                name: "GroupId",
                table: "TeacherFollowups");

            migrationBuilder.DropColumn(
                name: "TeachingNotes",
                table: "Groups");
        }
    }
}
