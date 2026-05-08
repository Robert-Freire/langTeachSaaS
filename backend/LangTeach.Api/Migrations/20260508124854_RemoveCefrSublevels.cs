using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCefrSublevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // SessionLogs.LevelReassessmentLevel: convert "X1.1" / "X1.2" / "X2.1" / "X2.2" to "X1" / "X2".
            // Values are 4-char strings; LIKE '__.[12]' matches: 2 chars, literal '.', then '1' or '2'.
            migrationBuilder.Sql(@"
                UPDATE [SessionLogs]
                SET [LevelReassessmentLevel] = LEFT([LevelReassessmentLevel], 2)
                WHERE [LevelReassessmentLevel] LIKE '__.[12]' AND LEN([LevelReassessmentLevel]) = 4;
            ");

            // Students.SkillLevelOverrides: JSON text column with values like ""speaking"":""A1.2"".
            // Replace each of the 12 sublevel string values with the base level. WHERE clause limits
            // the rewrite to rows that actually contain a sublevel value (matches "X.1" or "X.2").
            migrationBuilder.Sql(@"
                UPDATE [Students]
                SET [SkillLevelOverrides] =
                    REPLACE(REPLACE(REPLACE(REPLACE(
                    REPLACE(REPLACE(REPLACE(REPLACE(
                    REPLACE(REPLACE(REPLACE(REPLACE(
                        [SkillLevelOverrides],
                        '""A1.1""', '""A1""'), '""A1.2""', '""A1""'),
                        '""A2.1""', '""A2""'), '""A2.2""', '""A2""'),
                        '""B1.1""', '""B1""'), '""B1.2""', '""B1""'),
                        '""B2.1""', '""B2""'), '""B2.2""', '""B2""'),
                        '""C1.1""', '""C1""'), '""C1.2""', '""C1""'),
                        '""C2.1""', '""C2""'), '""C2.2""', '""C2""')
                WHERE [SkillLevelOverrides] LIKE '%.[12]""%';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op. Sublevel granularity cannot be restored from base levels.
        }
    }
}
