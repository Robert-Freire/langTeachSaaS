using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class UpdateLearningTargetsRequest
{
    [MaxCollectionCount(50)]
    public string[]? LearningTargets { get; set; }
}
