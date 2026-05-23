namespace LangTeach.Api.AI;

/// <summary>
/// Shared timeout budget for redacción correction requests.
/// HttpClient timeout and the stale-recovery threshold must be derived from the
/// same value so they stay in sync: stale fires only after the network call
/// would already have failed.
/// </summary>
public static class RedaccionCorrectionTimeouts
{
    /// <summary>Max seconds to wait for the Claude API to respond.</summary>
    public const int HttpClientSeconds = 600;

    /// <summary>
    /// Seconds before a correction stuck in Corrigiendo is considered stale.
    /// Must exceed HttpClientSeconds so a slow-but-live request is not reverted.
    /// </summary>
    public const int StaleCorrigiendoSeconds = HttpClientSeconds + 60;

    /// <summary>How often CorrectionWorker polls for Encolada rows (seconds).</summary>
    public const int WorkerPollIntervalSeconds = 2;

    /// <summary>
    /// Seconds before a correction stuck in Encolada is considered stale.
    /// Two poll cycles plus grace: if the worker is alive it should claim within 2 * pollInterval.
    /// </summary>
    public const int StaleEncoladaSeconds = WorkerPollIntervalSeconds * 2 + 60;
}
