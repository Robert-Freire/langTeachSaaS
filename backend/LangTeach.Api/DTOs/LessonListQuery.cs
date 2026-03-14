namespace LangTeach.Api.DTOs;

public class LessonListQuery
{
    public string? Language { get; set; }
    public string? CefrLevel { get; set; }
    public string? Status { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;

    private int _pageSize = 20;
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = Math.Clamp(value, 1, 100);
    }
}
