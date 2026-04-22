using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameFluencyToInteraction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Students.Difficulties uses default JsonSerializer (PascalCase keys)
            migrationBuilder.Sql("""
                UPDATE Students
                SET Difficulties = REPLACE(Difficulties, '"Competency":"Fluency"', '"Competency":"Interaction"')
                WHERE Difficulties LIKE '%"Competency":"Fluency"%'
                """);

            // SessionLogs.SuggestedDifficulties uses CamelCaseOptions (camelCase keys)
            migrationBuilder.Sql("""
                UPDATE SessionLogs
                SET SuggestedDifficulties = REPLACE(SuggestedDifficulties, '"competency":"Fluency"', '"competency":"Interaction"')
                WHERE SuggestedDifficulties LIKE '%"competency":"Fluency"%'
                """);

            // SessionLogs.MentionedDifficultyPairs uses default JsonSerializer (PascalCase keys)
            migrationBuilder.Sql("""
                UPDATE SessionLogs
                SET MentionedDifficultyPairs = REPLACE(MentionedDifficultyPairs, '"Competency":"Fluency"', '"Competency":"Interaction"')
                WHERE MentionedDifficultyPairs LIKE '%"Competency":"Fluency"%'
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE Students
                SET Difficulties = REPLACE(Difficulties, '"Competency":"Interaction"', '"Competency":"Fluency"')
                WHERE Difficulties LIKE '%"Competency":"Interaction"%'
                """);

            migrationBuilder.Sql("""
                UPDATE SessionLogs
                SET SuggestedDifficulties = REPLACE(SuggestedDifficulties, '"competency":"Interaction"', '"competency":"Fluency"')
                WHERE SuggestedDifficulties LIKE '%"competency":"Interaction"%'
                """);

            migrationBuilder.Sql("""
                UPDATE SessionLogs
                SET MentionedDifficultyPairs = REPLACE(MentionedDifficultyPairs, '"Competency":"Interaction"', '"Competency":"Fluency"')
                WHERE MentionedDifficultyPairs LIKE '%"Competency":"Interaction"%'
                """);
        }
    }
}
