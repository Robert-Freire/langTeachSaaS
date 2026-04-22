using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTeacherFollowupKindAndCoveredSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CoveredInSessionLogId",
                table: "TeacherFollowups",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "TeacherFollowups",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "operational");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherFollowups_CoveredInSessionLogId",
                table: "TeacherFollowups",
                column: "CoveredInSessionLogId");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherFollowups_TeacherId_StudentId_Kind",
                table: "TeacherFollowups",
                columns: new[] { "TeacherId", "StudentId", "Kind" });

            migrationBuilder.AddForeignKey(
                name: "FK_TeacherFollowups_SessionLogs_CoveredInSessionLogId",
                table: "TeacherFollowups",
                column: "CoveredInSessionLogId",
                principalTable: "SessionLogs",
                principalColumn: "Id");

            // Copy Student.TeachingTodos JSON rows into TeacherFollowups with Kind='pedagogical'
            migrationBuilder.Sql(@"
INSERT INTO TeacherFollowups
    (Id, TeacherId, StudentId, Text, Status, CreatedAt, SourceSessionLogId,
     CoveredInSessionLogId, Kind, DueDate, CompletedAt)
SELECT
    CAST(JSON_VALUE(t.value, '$.id') AS UNIQUEIDENTIFIER),
    s.TeacherId,
    s.Id,
    JSON_VALUE(t.value, '$.text'),
    LOWER(ISNULL(JSON_VALUE(t.value, '$.status'), 'pending')),
    ISNULL(
        TRY_CAST(JSON_VALUE(t.value, '$.createdAt') AS DATETIME2),
        s.UpdatedAt),
    TRY_CAST(JSON_VALUE(t.value, '$.sourceSessionLogId') AS UNIQUEIDENTIFIER),
    TRY_CAST(JSON_VALUE(t.value, '$.coveredInSessionLogId') AS UNIQUEIDENTIFIER),
    'pedagogical',
    NULL,
    NULL
FROM Students s
CROSS APPLY OPENJSON(s.TeachingTodos) AS t
WHERE s.TeachingTodos IS NOT NULL
  AND s.TeachingTodos <> '[]'
  AND s.TeachingTodos <> ''
  AND s.IsDeleted = 0
  AND JSON_VALUE(t.value, '$.id') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM TeacherFollowups f
      WHERE f.Id = CAST(JSON_VALUE(t.value, '$.id') AS UNIQUEIDENTIFIER)
  );
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TeacherFollowups_SessionLogs_CoveredInSessionLogId",
                table: "TeacherFollowups");

            migrationBuilder.DropIndex(
                name: "IX_TeacherFollowups_CoveredInSessionLogId",
                table: "TeacherFollowups");

            migrationBuilder.DropIndex(
                name: "IX_TeacherFollowups_TeacherId_StudentId_Kind",
                table: "TeacherFollowups");

            migrationBuilder.DropColumn(
                name: "CoveredInSessionLogId",
                table: "TeacherFollowups");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "TeacherFollowups");
        }
    }
}
