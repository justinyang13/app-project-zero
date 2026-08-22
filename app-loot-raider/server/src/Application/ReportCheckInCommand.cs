namespace Application;

/// <summary>
/// Represents the intent to report a spotted collectible at a venue (UC-6).
/// </summary>
public sealed record ReportCheckInCommand(
    string PromotionId,
    string CollectibleItemId,
    string VenueId,
    string? Nickname);
