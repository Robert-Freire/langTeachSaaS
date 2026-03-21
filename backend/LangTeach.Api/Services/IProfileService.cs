using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IProfileService
{
    Task<ProfileDto?> GetProfileAsync(string auth0UserId);
    Task<ProfileDto> UpdateProfileAsync(string auth0UserId, UpdateProfileRequest request);
    Task<Guid> UpsertTeacherAsync(string auth0UserId, string email, string name = "");
    Task<string> GetStoredEmailAsync(string auth0UserId);
    Task CompleteOnboardingAsync(string auth0UserId);
}
