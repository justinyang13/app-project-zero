namespace Infrastructure.Csv;

/// <summary>
/// Flat CSV row shapes. Kept separate from the Domain types (which are
/// immutable and self-validating) so CsvHelper's plain-property binding
/// never leaks into Domain.
/// </summary>
public sealed class PromotionRow
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ChainName { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsActive { get; set; }
}

public sealed class CollectibleItemRow
{
    public string Id { get; set; } = string.Empty;
    public string PromotionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public sealed class VenueRow
{
    public string Id { get; set; } = string.Empty;
    public string ChainName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Address { get; set; } = string.Empty;
}

public sealed class CheckInRow
{
    public string Id { get; set; } = string.Empty;
    public string PromotionId { get; set; } = string.Empty;
    public string CollectibleItemId { get; set; } = string.Empty;
    public string VenueId { get; set; } = string.Empty;
    public DateTime ReportedAtUtc { get; set; }
    public string? Nickname { get; set; }
}
