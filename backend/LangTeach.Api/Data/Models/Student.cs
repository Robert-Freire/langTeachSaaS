namespace LangTeach.Api.Data.Models;

public class Student
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LearningLanguage { get; set; } = string.Empty;
    public string CefrLevel { get; set; } = string.Empty;
    public string Interests { get; set; } = "[]";
    public string NativeLanguages { get; set; } = "[]";
    public string LearningGoals { get; set; } = "[]";
    public string Weaknesses { get; set; } = "[]";
    public string Difficulties { get; set; } = "[]";
    public string? PersonalNotes { get; set; }
    public string? TeachingNotes { get; set; }
    public string SkillLevelOverrides { get; set; } = "{}";
    // Identity fields
    public int? BirthYear { get; set; }
    public string? Profession { get; set; }
    public string? CountryOfOrigin { get; set; }
    public string? CityOfOrigin { get; set; }
    public string? CountryOfResidence { get; set; }
    public string? CityOfResidence { get; set; }
    public string? ReasonForStudying { get; set; }

    // Level fields
    public string? OfficialCefrLevel { get; set; }

    // Plan fields
    public string ShortTermObjectives { get; set; } = "[]";

    // Commercial fields
    public bool IsActive { get; set; } = true;
    public bool IsCorporate { get; set; }
    public string? Rate { get; set; }
    public TeachingChannel? TeachingChannel { get; set; }

    // Language fields
    public string SpokenLanguages { get; set; } = "[]";

    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public int? GetAge()
    {
        if (BirthYear is not int year) return null;
        var current = DateTime.UtcNow.Year;
        return year >= current - 120 && year <= current ? current - year : null;
    }

    public Teacher Teacher { get; set; } = null!;
    public ICollection<Lesson> Lessons { get; set; } = [];
    public ICollection<Course> Courses { get; set; } = [];
    public ICollection<SessionLog> SessionLogs { get; set; } = [];
    public ICollection<TeacherFollowup> TeacherFollowups { get; set; } = [];
    public ICollection<StudentGroup> StudentGroups { get; set; } = [];
}
