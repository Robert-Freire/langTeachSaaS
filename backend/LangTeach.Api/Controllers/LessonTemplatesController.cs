using LangTeach.Api.Data;
using LangTeach.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/lesson-templates")]
[Authorize]
public class LessonTemplatesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<LessonTemplatesController> _logger;

    public LessonTemplatesController(AppDbContext db, ILogger<LessonTemplatesController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var templates = await _db.LessonTemplates
            .OrderBy(t => t.Name)
            .Select(t => new LessonTemplateDto(t.Id, t.Name, t.Description))
            .ToListAsync();

        _logger.LogInformation("GET /api/lesson-templates. Count={Count}", templates.Count);
        return Ok(templates);
    }
}
