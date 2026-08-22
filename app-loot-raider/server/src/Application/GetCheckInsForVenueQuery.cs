namespace Application;

/// <summary>
/// Represents the intent to fetch the full check-in history for one venue
/// (UC-5).
/// </summary>
public sealed record GetCheckInsForVenueQuery(string VenueId, string PromotionId);
