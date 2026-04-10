# Task 625: Student Profile Additive Scalar Fields (Backend Prep)

## Goal

Add ~15 new columns to `Student`, expose via DTOs, validate, seed, and unit-test JSON round-trips.

## Files to change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Data/Models/Student.cs` | Add 15 new properties |
| `backend/LangTeach.Api/DTOs/ShortTermObjectiveDto.cs` | New record |
| `backend/LangTeach.Api/DTOs/StudentDto.cs` | Add all new fields |
| `backend/LangTeach.Api/DTOs/CreateStudentRequest.cs` | Add new fields + validation |
| `backend/LangTeach.Api/DTOs/UpdateStudentRequest.cs` | Add new fields + validation |
| `backend/LangTeach.Api/Services/StudentService.cs` | MapToDto, Create, Update |
| `backend/LangTeach.Api/Data/DemoSeeder.cs` | Populate Ana and Diego new fields |
| `backend/LangTeach.Api.Tests/Services/StudentServiceTests.cs` | JSON round-trip tests |
| EF Migration | `dotnet ef migrations add AddStudentProfileFields` |

## New fields

### Identity (nullable, no default)
- `BirthYear` (int?)
- `Profession` (string?, max 128)
- `CountryOfOrigin` (string?, max 64)
- `CityOfOrigin` (string?, max 64)
- `CountryOfResidence` (string?, max 64)
- `CityOfResidence` (string?, max 64)
- `ReasonForStudying` (string?, max 512)

### Level
- `OfficialCefrLevel` (string?, nullable, validated as CEFR or null)

### Plan (JSON, NOT NULL, default "[]")
- `ShortTermObjectives` (string JSON) -> exposed as `List<ShortTermObjectiveDto>`
- `ShortTermObjectiveDto`: `{ Id: string, Text: string, TargetDate: DateOnly? }`

### Commercial
- `IsActive` (bool, NOT NULL, default true)
- `IsCorporate` (bool, NOT NULL, default false)
- `Rate` (string?, max 32)

### Languages (JSON, NOT NULL, default "[]")
- `SpokenLanguages` (string JSON) -> exposed as `List<string>`

## Validation

- `BirthYear`: range 1920..current year
- `Rate`: max 32 chars
- `ShortTermObjectives`: max 10 entries; each Id max 50, Text max 200
- `OfficialCefrLevel`: null or one of A1,A2,B1,B2,C1,C2
- String fields: max-length annotations

## List endpoint

`GET /api/students` must project `IsActive`, `IsCorporate`, `Rate` (already in `StudentDto` which is used for both list and detail).

## Seeder updates

Ana Seed: add profession, countryOfOrigin, isActive, spokenLanguages, shortTermObjectives
Diego Seed: add rate, isCorporate, isActive, shortTermObjectives

## Tests

Unit tests in `StudentServiceTests.cs` for:
1. Create with ShortTermObjectives -> round-trip returns same list
2. Update clears objectives to empty list
3. Create with SpokenLanguages -> round-trip

## Migration

Run `dotnet ef migrations add AddStudentProfileFields --project backend/LangTeach.Api --startup-project backend/LangTeach.Api` after entity changes.
