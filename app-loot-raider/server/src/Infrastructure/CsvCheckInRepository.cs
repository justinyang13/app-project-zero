using Application;
using Domain;
using Infrastructure.Csv;

namespace Infrastructure;

public sealed class CsvCheckInRepository : ICheckInRepository
{
    private const int MaxRecentItemsPerVenue = 3;

    private readonly ICsvTableStore<CheckInRow> _checkIns;

    public CsvCheckInRepository(ICsvTableStore<CheckInRow> checkIns)
    {
        _checkIns = checkIns;
    }

    public async Task<CheckIn> AddAsync(CheckIn checkIn)
    {
        var rows = (await _checkIns.ReadAllAsync()).ToList();
        rows.Add(ToRow(checkIn));

        await _checkIns.WriteAllAsync(rows);

        return checkIn;
    }

    public async Task<IReadOnlyList<CheckIn>> GetByVenueIdAsync(string venueId, string promotionId)
    {
        var rows = await _checkIns.ReadAllAsync();

        return rows
            .Where(row => row.VenueId == venueId && row.PromotionId == promotionId)
            .OrderByDescending(row => row.ReportedAtUtc)
            .Select(ToDomain)
            .ToList();
    }

    public async Task<IReadOnlyDictionary<string, VenueCheckInSummary>> GetSummaryByVenueIdsAsync(
        IEnumerable<string> venueIds,
        string promotionId)
    {
        var venueIdSet = venueIds.ToHashSet();
        var rows = await _checkIns.ReadAllAsync();

        var relevant = rows
            .Where(row => row.PromotionId == promotionId && venueIdSet.Contains(row.VenueId));

        return relevant
            .GroupBy(row => row.VenueId)
            .ToDictionary(
                group => group.Key,
                group => new VenueCheckInSummary(
                    CheckInCount: group.Count(),
                    RecentCollectibleItemIds: group
                        .OrderByDescending(row => row.ReportedAtUtc)
                        .Select(row => row.CollectibleItemId)
                        .Distinct()
                        .Take(MaxRecentItemsPerVenue)
                        .ToList(),
                    LastCheckInAtUtc: group.Max(row => row.ReportedAtUtc)));
    }

    private static CheckInRow ToRow(CheckIn checkIn) => new()
    {
        Id = checkIn.Id,
        PromotionId = checkIn.PromotionId,
        CollectibleItemId = checkIn.CollectibleItemId,
        VenueId = checkIn.VenueId,
        ReportedAtUtc = checkIn.ReportedAtUtc,
        Nickname = checkIn.Nickname,
    };

    private static CheckIn ToDomain(CheckInRow row) =>
        new(row.Id, row.PromotionId, row.CollectibleItemId, row.VenueId, row.ReportedAtUtc, row.Nickname);
}
