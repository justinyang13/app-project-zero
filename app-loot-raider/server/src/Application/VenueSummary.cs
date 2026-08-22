using Domain;

namespace Application;

/// <summary>
/// Read-model combining a <see cref="Venue"/> with the aggregate check-in
/// data needed to render a pin and its hover tooltip (UC-3, UC-4) without a
/// per-pin request.
/// </summary>
public sealed record VenueSummary(
    Venue Venue,
    int CheckInCount,
    IReadOnlyList<CollectibleItem> RecentItems,
    DateTime? LastCheckInAtUtc);
