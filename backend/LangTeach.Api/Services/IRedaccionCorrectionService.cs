using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IRedaccionCorrectionService
{
    Task<CorrectionDetailDto> CorregirAsync(
        Guid teacherId, Guid studentId, Guid correctionId, CancellationToken cancellationToken = default);
}

public class CorrectionNotFoundException : Exception
{
    public CorrectionNotFoundException() : base("Correction not found.") { }
}

public class CorrectionInvalidStateException : Exception
{
    public string Code { get; }
    public CorrectionInvalidStateException(string code, string message) : base(message)
    {
        Code = code;
    }
}

public class CorrectionGenerationException : Exception
{
    public string Code { get; }
    public CorrectionGenerationException(string code, string message, Exception? inner = null)
        : base(message, inner)
    {
        Code = code;
    }
}

// Thrown when a teacher over their monthly generation quota requests a correction.
// Carries the usage status so the controller can mirror GenerateController's 429 response
// (message + resetsAt + Retry-After). A correction counts against the same monthly quota
// as a lesson generation (#1223).
public class CorrectionQuotaExceededException : Exception
{
    public UsageStatusDto UsageStatus { get; }
    public CorrectionQuotaExceededException(UsageStatusDto usageStatus)
        : base("Monthly generation limit reached.")
    {
        UsageStatus = usageStatus;
    }
}
