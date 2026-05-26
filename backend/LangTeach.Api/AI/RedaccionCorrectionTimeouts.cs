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
    /// Set equal to StaleCorrigiendoSeconds: a queue can grow when the worker is busy processing
    /// a long correction (up to HttpClientSeconds), so two poll cycles + 60s is too aggressive.
    /// Encolada stale fires only when the worker has been silent for the full Corrigiendo window.
    /// </summary>
    public const int StaleEncoladaSeconds = StaleCorrigiendoSeconds;
}
