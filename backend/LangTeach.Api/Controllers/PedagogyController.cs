using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/pedagogy")]
[Authorize]
public class PedagogyController : ControllerBase
{
    private static readonly string[] Sections = ["WarmUp", "Presentation", "Practice", "Production", "WrapUp"];
    private static readonly string[] Levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

    private readonly ISectionProfileService _sectionProfiles;

    public PedagogyController(ISectionProfileService sectionProfiles)
    {
        _sectionProfiles = sectionProfiles;
    }

    /// <summary>
    /// Returns allowed content types per section per CEFR level.
    /// Shape: { sectionType: { cefrLevel: string[] } }
    /// </summary>
    [HttpGet("section-rules")]
    public IActionResult GetSectionRules()
    {
        var result = Sections.ToDictionary(
            section => section,
            section => Levels.ToDictionary(
                level => level,
                level => _sectionProfiles.GetAllowedContentTypes(section, level)
            )
        );

        return Ok(result);
    }
}
