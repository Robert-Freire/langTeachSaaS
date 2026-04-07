# to do

1. import students in azure
  cd backend; dotnet run --project LangTeach.MigrationTool -- --file
  "../../feedback/raw/2026-03-29-jordi-excel-alumnos-actuales.xlsx" --teacher-id <jordi-guid> --connection        
  "<prod-conn-string>" --dry-run
2. check mcps C:\ws\PersonalOS\03_Workspace\langTeachSaaS\plan\mcp-exploration.md
3. 
4. Manage usage of dev acounts
The QA account email is e2e-teacher-test@langteach.dev. Run this to reset its April usage:                                                                                            
  MSYS_NO_PATHCONV=1 docker exec langteach-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U 
  sa -P "$(grep SA_PASSWORD /c/ws/PersonalOS/03_Workspace/langTeachSaaS/infra/.env | cut -d=   -f2)" -C -Q "DELETE FROM GenerationUsages WHERE TeacherId = (SELECT Id FROM Teachers     
  WHERE Email = 'e2e-teacher-test@langteach.dev') AND CreatedAt >= '2026-04-01'" 