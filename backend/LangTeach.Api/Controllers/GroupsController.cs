using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/groups")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _groupService;
    private readonly IProfileService _profileService;
    private readonly ILogger<GroupsController> _logger;

    public GroupsController(
        IGroupService groupService,
        IProfileService profileService,
        ILogger<GroupsController> logger)
    {
        _groupService = groupService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] GroupListQuery query, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var result = await _groupService.ListAsync(teacherId, query, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var group = await _groupService.GetByIdAsync(teacherId, id, ct);
        return group is null ? NotFound() : Ok(group);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGroupRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        try
        {
            var group = await _groupService.CreateAsync(teacherId, request, ct);
            return CreatedAtAction(nameof(GetById), new { id = group.Id }, group);
        }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateGroupRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        try
        {
            var group = await _groupService.UpdateAsync(teacherId, id, request, ct);
            return group is null ? NotFound() : Ok(group);
        }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var deleted = await _groupService.DeleteAsync(teacherId, id, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddGroupMemberRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        try
        {
            var group = await _groupService.AddMemberAsync(teacherId, id, request.StudentId, ct);
            return group is null ? NotFound() : Ok(group);
        }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(string.Empty, ex.Message);
            return BadRequest(ModelState);
        }
    }

    [HttpDelete("{id:guid}/members/{studentId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid studentId, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var group = await _groupService.RemoveMemberAsync(teacherId, id, studentId, ct);
        return group is null ? NotFound() : Ok(group);
    }
}
