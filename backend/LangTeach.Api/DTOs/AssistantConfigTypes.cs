namespace LangTeach.Api.DTOs;

public record ProposalFieldEntry(string Field, string Label);

public record SkillLevelFieldEntry(string Field, string Label, string SkillKey);

public record SessionFieldEntry(string Field, string Label, bool Multiline);

public record ProposalFieldsConfig(
    ProposalFieldEntry[] StudentFields,
    SkillLevelFieldEntry[] SkillLevelFields,
    SessionFieldEntry[] SessionFields
);
