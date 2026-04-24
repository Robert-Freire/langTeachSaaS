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
    parsed.TodoId,
    s.TeacherId,
    s.Id,
    LEFT(parsed.Text, 500),
    LOWER(ISNULL(JSON_VALUE(t.value, '$.status'), 'pending')),
    ISNULL(
        TRY_CAST(JSON_VALUE(t.value, '$.createdAt') AS DATETIME2),
        s.UpdatedAt),
    sourceLog.Id,
    coveredLog.Id,
    'pedagogical',
    NULL,
    NULL
FROM Students s
CROSS APPLY OPENJSON(s.TeachingTodos) AS t
OUTER APPLY (
    SELECT
        TRY_CAST(JSON_VALUE(t.value, '$.id') AS UNIQUEIDENTIFIER) AS TodoId,
        NULLIF(LTRIM(RTRIM(JSON_VALUE(t.value, '$.text'))), '') AS Text,
        TRY_CAST(JSON_VALUE(t.value, '$.sourceSessionLogId') AS UNIQUEIDENTIFIER) AS SourceSessionLogId,
        TRY_CAST(JSON_VALUE(t.value, '$.coveredInSessionLogId') AS UNIQUEIDENTIFIER) AS CoveredInSessionLogId
) parsed
LEFT JOIN SessionLogs sourceLog
    ON sourceLog.Id = parsed.SourceSessionLogId
LEFT JOIN SessionLogs coveredLog
    ON coveredLog.Id = parsed.CoveredInSessionLogId
WHERE s.TeachingTodos IS NOT NULL
  AND s.TeachingTodos <> '[]'
  AND s.TeachingTodos <> ''
  AND ISJSON(s.TeachingTodos) = 1
  AND s.IsDeleted = 0
  AND parsed.TodoId IS NOT NULL
  AND parsed.Text IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM TeacherFollowups f
      WHERE f.Id = parsed.TodoId
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
