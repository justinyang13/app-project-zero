using Application;
using Domain;

namespace Application.Tests;

/// <summary>
/// Hand-rolled in-memory fakes for the Application-layer interfaces —
/// simple enough that the test project has no need for a mocking library.
/// </summary>
internal sealed class FakePromotionRepository : IPromotionRepository
{
    private readonly Promotion? _activePromotion;
    private readonly List<CollectibleItem> _items;

    public FakePromotionRepository(Promotion? activePromotion, IEnumerable<CollectibleItem>? items = null)
    {
        _activePromotion = activePromotion;
        _items = items?.ToList() ?? [];
    }

    public Task<Promotion?> GetActiveAsync() => Task.FromResult(_activePromotion);

    public Task<IReadOnlyList<CollectibleItem>> GetCollectibleItemsAsync(string promotionId) =>
        Task.FromResult<IReadOnlyList<CollectibleItem>>(
            _items.Where(item => item.PromotionId == promotionId).ToList());
}

internal sealed class FakeVenueCache : IVenueCache
{
    public List<Venue> Venues { get; } = [];

    public Task<IReadOnlyList<Venue>> GetNearAsync(double latitude, double longitude, int radiusMeters, string chainName) =>
        Task.FromResult<IReadOnlyList<Venue>>(Venues.Where(v => v.ChainName == chainName).ToList());

    public Task UpsertAsync(IEnumerable<Venue> venues)
    {
        Venues.AddRange(venues);
        return Task.CompletedTask;
    }
}

internal sealed class FakeVenueDiscoveryService : IVenueDiscoveryService
{
    private readonly IReadOnlyList<Venue> _result;
    private readonly Exception? _throws;

    public FakeVenueDiscoveryService(IReadOnlyList<Venue> result)
    {
        _result = result;
    }

    public FakeVenueDiscoveryService(Exception throws)
    {
        _result = [];
        _throws = throws;
    }

    public Task<IReadOnlyList<Venue>> SearchAsync(double latitude, double longitude, int radiusMeters, string chainName) =>
        _throws is not null ? Task.FromException<IReadOnlyList<Venue>>(_throws) : Task.FromResult(_result);
}

internal sealed class FakeCheckInRepository : ICheckInRepository
{
    public List<CheckIn> CheckIns { get; } = [];

    public Task<CheckIn> AddAsync(CheckIn checkIn)
    {
        CheckIns.Add(checkIn);
        return Task.FromResult(checkIn);
    }

    public Task<IReadOnlyList<CheckIn>> GetByVenueIdAsync(string venueId, string promotionId) =>
        Task.FromResult<IReadOnlyList<CheckIn>>(
            CheckIns
                .Where(c => c.VenueId == venueId && c.PromotionId == promotionId)
                .OrderByDescending(c => c.ReportedAtUtc)
                .ToList());

    public Task<IReadOnlyDictionary<string, VenueCheckInSummary>> GetSummaryByVenueIdsAsync(
        IEnumerable<string> venueIds, string promotionId)
    {
        var venueIdSet = venueIds.ToHashSet();

        var summary = CheckIns
            .Where(c => c.PromotionId == promotionId && venueIdSet.Contains(c.VenueId))
            .GroupBy(c => c.VenueId)
            .ToDictionary(
                g => g.Key,
                g => new VenueCheckInSummary(
                    g.Count(),
                    g.OrderByDescending(c => c.ReportedAtUtc).Select(c => c.CollectibleItemId).Distinct().Take(3).ToList(),
                    g.Max(c => c.ReportedAtUtc)));

        return Task.FromResult<IReadOnlyDictionary<string, VenueCheckInSummary>>(summary);
    }
}
