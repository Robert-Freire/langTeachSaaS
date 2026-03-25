using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/curriculum-templates")]
[Authorize]
public class CurriculumTemplatesController : ControllerBase
{
    private readonly ICurriculumTemplateService _templates;
    private readonly ISessionMappingService _sessionMapping;

    public CurriculumTemplatesController(
        ICurriculumTemplateService templates,
        ISessionMappingService sessionMapping)
    {
        _templates = templates;
        _sessionMapping = sessionMapping;
    }

    [HttpGet]
    public IActionResult List() => Ok(_templates.GetAll());

    [HttpGet("{level}")]
    public IActionResult GetByLevel(string level)
    {
        var template = _templates.GetByLevel(level);
        return template is null ? NotFound() : Ok(template);
    }

    [HttpGet("{level}/mapping")]
    public IActionResult GetMapping(string level, [FromQuery] int sessionCount)
    {
        if (sessionCount < 1 || sessionCount > 100)
            return BadRequest("sessionCount must be between 1 and 100.");

        var template = _templates.GetByLevel(level);
        if (template is null) return NotFound();

        if (template.Units.Count == 0)
            return BadRequest("Template has no units.");

        var result = _sessionMapping.Compute(template.Units, sessionCount);
        return Ok(result);
    }
}
