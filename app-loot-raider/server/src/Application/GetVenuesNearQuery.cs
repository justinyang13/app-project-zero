namespace Application;

/// <summary>
/// Represents the intent to fetch venues near a point for the active
/// promotion's chain, with pre-aggregated check-in summaries (UC-3, UC-4).
/// When <see cref="CollectibleItemId"/> is set, only venues with at least
/// one check-in for that item are returned.
/// </summary>
public sealed record GetVenuesNearQuery(
    double Latitude,
    double Longitude,
    int RadiusMeters,
    string PromotionId,
    string? CollectibleItemId = null);
