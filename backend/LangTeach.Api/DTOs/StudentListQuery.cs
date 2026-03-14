namespace LangTeach.Api.DTOs;

public class StudentListQuery
{
    public string? Language { get; set; }
    public string? CefrLevel { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
