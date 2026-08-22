namespace Domain;

/// <summary>
/// One collectible within a promotion's catalog (e.g. one Happy Meal toy).
/// </summary>
public sealed class CollectibleItem
{
    public string Id { get; }
    public string PromotionId { get; }
    public string Name { get; }
    public string ImageUrl { get; }
    public int SortOrder { get; }

    public CollectibleItem(
        string id,
        string promotionId,
        string name,
        string imageUrl,
        int sortOrder)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ArgumentException("CollectibleItem id cannot be null or whitespace.", nameof(id));
        }

        if (string.IsNullOrWhiteSpace(promotionId))
        {
            throw new ArgumentException("CollectibleItem promotionId cannot be null or whitespace.", nameof(promotionId));
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("CollectibleItem name cannot be null or whitespace.", nameof(name));
        }

        Id = id;
        PromotionId = promotionId;
        Name = name;
        ImageUrl = imageUrl ?? string.Empty;
        SortOrder = sortOrder;
    }
}
