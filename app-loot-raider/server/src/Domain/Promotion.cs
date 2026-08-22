namespace Domain;

/// <summary>
/// A limited-time collectible campaign (e.g. a fast-food chain's toy
/// promotion). Naming is deliberately promotion-agnostic so a second
/// promotion never requires a schema change, just new seed data.
/// </summary>
public sealed class Promotion
{
    public string Id { get; }
    public string Name { get; }
    public string ChainName { get; }
    public DateOnly StartDate { get; }
    public DateOnly EndDate { get; }
    public bool IsActive { get; }

    public Promotion(
        string id,
        string name,
        string chainName,
        DateOnly startDate,
        DateOnly endDate,
        bool isActive)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ArgumentException("Promotion id cannot be null or whitespace.", nameof(id));
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Promotion name cannot be null or whitespace.", nameof(name));
        }

        if (string.IsNullOrWhiteSpace(chainName))
        {
            throw new ArgumentException("Promotion chain name cannot be null or whitespace.", nameof(chainName));
        }

        if (endDate < startDate)
        {
            throw new ArgumentException("End date cannot precede start date.", nameof(endDate));
        }

        Id = id;
        Name = name;
        ChainName = chainName;
        StartDate = startDate;
        EndDate = endDate;
        IsActive = isActive;
    }
}
