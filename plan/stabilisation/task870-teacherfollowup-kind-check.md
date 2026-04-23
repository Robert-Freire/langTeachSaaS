# Task 870: CHECK constraint for TeacherFollowup.Kind

Issue: #870 (size:XS, area:backend, type:tech-debt, milestone Stabilisation)

## Goal

Add a DB-level CHECK constraint so `TeacherFollowup.Kind` cannot be set to values outside `pedagogical` / `operational`, defending against direct DB writes (seeders, imports, raw SQL) that bypass the DTO regex validation added in #844.

## Approach

1. `AppDbContext.OnModelCreating` TeacherFollowup entity: add
   ```csharp
   e.ToTable(t => t.HasCheckConstraint("CK_TeacherFollowups_Kind", "Kind IN ('pedagogical', 'operational')"));
   ```
   (EF Core 9 API, since `ModelBuilder.HasCheckConstraint` on entity type builder was obsoleted.)
2. Run `dotnet ef migrations add AddTeacherFollowupKindCheckConstraint -p backend/LangTeach.Api`. Let EF generate the DDL from the model config (single source of truth). Do NOT also hand-write `migrationBuilder.Sql("ALTER TABLE ... ADD CONSTRAINT ...")` in the migration, which would create the constraint twice and break the apply.
3. No new test: test fixture (`WebAppFactory`) uses EF InMemory provider, which ignores CHECK constraints. Runtime enforcement against a real SQL Server would need a separate LocalDB/Testcontainers fixture, which is out of scope for this XS task. The generated migration's `AddCheckConstraint(...)` call is the enforcement guarantee; `dotnet ef database update` against dev SQL Server is the smoke check.
4. No behavioral change for valid rows. DTO regex continues to cover API path; constraint is a belt-and-braces defense at the DB.

## Files touched

- `backend/LangTeach.Api/Data/AppDbContext.cs`
- `backend/LangTeach.Api/Migrations/<timestamp>_AddTeacherFollowupKindCheckConstraint.cs` (new, generated)
- `backend/LangTeach.Api/Migrations/AppDbContextModelSnapshot.cs` (regenerated)

## Testing

- `dotnet build`
- `dotnet test` (existing tests must still pass; seeders already write valid values)
- Migration smoke test: `dotnet ef database update` should succeed against fresh dev DB.

## Risks

- If any existing row has a value outside the allowed set, the migration will fail. Current data (seeders, and migration #20260422120546 copy-from-JSON which hardcodes `'pedagogical'`) only ever writes `pedagogical` or `operational`, so this is safe.
