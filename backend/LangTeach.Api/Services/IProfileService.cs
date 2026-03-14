using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IProfileService
{
    Task<ProfileDto?> GetProfileAsync(string auth0UserId);
    Task<ProfileDto> UpdateProfileAsync(string auth0UserId, UpdateProfileRequest request);
    Task UpsertTeacherAsync(string auth0UserId, string email);
}
