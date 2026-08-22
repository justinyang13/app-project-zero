namespace Domain;

/// <summary>
/// A visitor-submitted report that a specific collectible was spotted at a
/// specific venue. No account/device identity is attached — the client-side
/// soft daily limit is spam friction only, not a server-enforced identity.
/// </summary>
public sealed class CheckIn
{
    public string Id { get; }
    public string PromotionId { get; }
    public string CollectibleItemId { get; }
    public string VenueId { get; }
    public DateTime ReportedAtUtc { get; }
    public string? Nickname { get; }

    public CheckIn(
        string id,
        string promotionId,
        string collectibleItemId,
        string venueId,
        DateTime reportedAtUtc,
        string? nickname = null)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ArgumentException("CheckIn id cannot be null or whitespace.", nameof(id));
        }

        if (string.IsNullOrWhiteSpace(promotionId))
        {
            throw new ArgumentException("CheckIn promotionId cannot be null or whitespace.", nameof(promotionId));
        }

        if (string.IsNullOrWhiteSpace(collectibleItemId))
        {
            throw new ArgumentException("CheckIn collectibleItemId cannot be null or whitespace.", nameof(collectibleItemId));
        }

        if (string.IsNullOrWhiteSpace(venueId))
        {
            throw new ArgumentException("CheckIn venueId cannot be null or whitespace.", nameof(venueId));
        }

        Id = id;
        PromotionId = promotionId;
        CollectibleItemId = collectibleItemId;
        VenueId = venueId;
        ReportedAtUtc = reportedAtUtc;
        Nickname = string.IsNullOrWhiteSpace(nickname) ? null : nickname.Trim();
    }
}
