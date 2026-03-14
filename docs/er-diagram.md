# LangTeach SaaS — Entity-Relationship Diagram (Phase 1)

> Reflects the EF Core schema introduced in T4. JSON-serialized columns are noted but shown as scalar strings in the diagram.

```mermaid
erDiagram
    Teacher {
        Guid Id PK
        string Auth0UserId UK "from JWT sub claim"
        string Email
        string DisplayName
        DateTime CreatedAt
        DateTime UpdatedAt
    }

    TeacherSettings {
        Guid Id PK
        Guid TeacherId FK
        string TeachingLanguages "JSON string[]"
        string CefrLevels "JSON string[]"
        string PreferredStyle "Formal | Conversational | ExamPrep"
        DateTime CreatedAt
        DateTime UpdatedAt
    }

    Student {
        Guid Id PK
        Guid TeacherId FK
        string Name
        string LearningLanguage
        string CefrLevel "A1|A2|B1|B2|C1|C2"
        string Interests "JSON string[]"
        string Notes "nullable"
        bool IsDeleted "soft delete"
        DateTime CreatedAt
        DateTime UpdatedAt
    }

    LessonTemplate {
        Guid Id PK
        string Name
        string Description
        string DefaultSections "JSON TemplateSectionDto[]"
    }

    Lesson {
        Guid Id PK
        Guid TeacherId FK
        Guid StudentId FK "nullable, set null on delete"
        Guid TemplateId FK "nullable, set null on delete"
        string Title
        string Language
        string CefrLevel
        string Topic
        int DurationMinutes
        string Objectives "nullable"
        string Status "Draft | Published"
        bool IsDeleted "soft delete"
        DateTime CreatedAt
        DateTime UpdatedAt
    }

    LessonSection {
        Guid Id PK
        Guid LessonId FK
        string SectionType "WarmUp|Presentation|Practice|Production|WrapUp"
        int OrderIndex
        string Notes "nullable"
        DateTime CreatedAt
        DateTime UpdatedAt
    }

    Teacher ||--o| TeacherSettings : "has settings"
    Teacher ||--o{ Student : "owns"
    Teacher ||--o{ Lesson : "creates"
    Student }o--o{ Lesson : "assigned to"
    LessonTemplate }o--o{ Lesson : "used by"
    Lesson ||--o{ LessonSection : "contains"
```

## Notes

- All FKs use `Guid` type.
- `Teacher.Auth0UserId` has a unique index — used to look up the teacher row from the JWT `sub` claim.
- `Student` and `Lesson` use soft delete (`IsDeleted`); hard deletes are not exposed via the API.
- `LessonTemplate` is seeded at startup and is read-only at runtime.
- JSON columns (`TeachingLanguages`, `CefrLevels`, `Interests`, `DefaultSections`) are stored as `nvarchar(max)` strings and serialized/deserialized in the service layer (not via EF JSON owned types) for Azure SQL compatibility.
- The `AuthController.Me()` Teacher upsert is wired in T5, not T4.
