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
}

public sealed record VenueCheckInSummary(
    int CheckInCount,
    IReadOnlyList<string> RecentCollectibleItemIds,
    DateTime LastCheckInAtUtc);
