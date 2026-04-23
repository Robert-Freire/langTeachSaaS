using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LangTeach.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameMandarin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE Students
                SET NativeLanguages = REPLACE(NativeLanguages, '"Mandarin"', '"Chinese (Mandarin)"')
                WHERE NativeLanguages LIKE '%"Mandarin"%'
                  AND NativeLanguages NOT LIKE '%"Chinese (Mandarin)"%'
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE Students
                SET NativeLanguages = REPLACE(NativeLanguages, '"Chinese (Mandarin)"', '"Mandarin"')
                WHERE NativeLanguages LIKE '%"Chinese (Mandarin)"%'
                """);
        }
    }
}
