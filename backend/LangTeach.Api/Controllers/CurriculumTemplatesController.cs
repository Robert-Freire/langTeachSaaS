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

    public CurriculumTemplatesController(ICurriculumTemplateService templates)
    {
        _templates = templates;
    }

    [HttpGet]
    public IActionResult List() => Ok(_templates.GetAll());

    [HttpGet("{level}")]
    public IActionResult GetByLevel(string level)
    {
        var template = _templates.GetByLevel(level);
        return template is null ? NotFound() : Ok(template);
    }
}
