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

    public LessonTemplatesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var templates = await _db.LessonTemplates
            .OrderBy(t => t.Name)
            .Select(t => new LessonTemplateDto(t.Id, t.Name, t.Description))
            .ToListAsync();

        return Ok(templates);
    }
}
