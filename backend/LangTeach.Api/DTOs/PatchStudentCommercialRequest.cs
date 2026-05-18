namespace LangTeach.Api.DTOs;

public class PatchStudentCommercialRequest
{
    // null = clear the channel; any valid value = set it.
    // The client owns the intent — whatever arrives is applied.
    public string? TeachingChannel { get; set; }
}
