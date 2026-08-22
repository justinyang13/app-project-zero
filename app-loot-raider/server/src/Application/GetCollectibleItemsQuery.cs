namespace Application;

/// <summary>
/// Represents the intent to fetch a promotion's collectible catalog (UC-7).
/// </summary>
public sealed record GetCollectibleItemsQuery(string PromotionId);
