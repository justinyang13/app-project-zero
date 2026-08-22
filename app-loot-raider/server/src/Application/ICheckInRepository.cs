using Domain;

namespace Application;

/// <summary>
/// Dependency the Application layer requires but does not implement.
/// Infrastructure provides the concrete (CSV-backed) implementation.
/// </summary>
public interface ICheckInRepository
{
    Task<CheckIn> AddAsync(CheckIn checkIn);

    Task<IReadOnlyList<CheckIn>> GetByVenueIdAsync(string venueId, string promotionId);

    /// <summary>
    /// Pre-aggregated per-venue summary (count + most recent item ids) used
    /// to build hover/pin tooltips without a per-pin request.
    /// </summary>
    Task<IReadOnlyDictionary<string, VenueCheckInSummary>> GetSummaryByVenueIdsAsync(
        IEnumerable<string> venueIds,
        string promotionId);

    /// <summary>
    /// Of the given candidate venue ids, returns the subset that have at
    /// least one check-in for the given item — a real filter, unlike
    /// <see cref="VenueCheckInSummary.RecentCollectibleItemIds"/> which is
    /// truncated to the most recent few and so isn't safe to filter on.
    /// </summary>
    Task<IReadOnlySet<string>> GetVenueIdsWithCheckInAsync(
        string collectibleItemId,
        string promotionId,
        IEnumerable<string> candidateVenueIds);
}

public sealed record VenueCheckInSummary(
    int CheckInCount,
    IReadOnlyList<string> RecentCollectibleItemIds,
    DateTime LastCheckInAtUtc);
