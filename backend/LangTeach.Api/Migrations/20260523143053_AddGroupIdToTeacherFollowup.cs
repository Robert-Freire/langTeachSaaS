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

            migrationBuilder.DropColumn(
                name: "GroupId",
                table: "TeacherFollowups");
        }
    }
}
