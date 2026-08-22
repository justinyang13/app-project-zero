namespace Application;

/// <summary>
/// Represents the intent to report a spotted collectible at a venue (UC-6).
/// </summary>
/// <param name="ReportedAtUtc">
/// The time of day the visitor says they saw it, client-supplied (defaults
/// to "now" client-side) so they can log a sighting from a few minutes ago
/// rather than only "right now". The date always ends up as today's — see
/// <see cref="ReportCheckInHandler"/> — this only lets the time-of-day vary.
/// </param>
public sealed record ReportCheckInCommand(
    string PromotionId,
    string CollectibleItemId,
    string VenueId,
    string? Nickname,
    DateTime? ReportedAtUtc = null);
