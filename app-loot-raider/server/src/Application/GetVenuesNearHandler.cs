using Domain;

namespace Application;

/// <summary>
/// Executes the GetVenuesNearQuery use case. Cache-first: only calls out to
/// <see cref="IVenueDiscoveryService"/> (Overpass) when the cache has
/// nothing for this area yet, and falls back to whatever's cached — even if
/// that means an empty result — when the discovery service is unavailable
/// (UC-3 edge cases).
/// </summary>
public sealed class GetVenuesNearHandler
{
    private const int MaxRecentItems = 3;

    private readonly IPromotionRepository _promotionRepository;
    private readonly IVenueCache _venueCache;
    private readonly IVenueDiscoveryService _venueDiscoveryService;
    private readonly ICheckInRepository _checkInRepository;

    public GetVenuesNearHandler(
        IPromotionRepository promotionRepository,
        IVenueCache venueCache,
        IVenueDiscoveryService venueDiscoveryService,
        ICheckInRepository checkInRepository)
    {
        _promotionRepository = promotionRepository ?? throw new ArgumentNullException(nameof(promotionRepository));
        _venueCache = venueCache ?? throw new ArgumentNullException(nameof(venueCache));
        _venueDiscoveryService = venueDiscoveryService ?? throw new ArgumentNullException(nameof(venueDiscoveryService));
        _checkInRepository = checkInRepository ?? throw new ArgumentNullException(nameof(checkInRepository));
    }

    public async Task<IReadOnlyList<VenueSummary>> Handle(GetVenuesNearQuery query)
    {
        var promotion = await _promotionRepository.GetActiveAsync();
        if (promotion is null)
        {
            return [];
        }

        var venues = await _venueCache.GetNearAsync(query.Latitude, query.Longitude, query.RadiusMeters, promotion.ChainName);

        if (venues.Count == 0)
        {
            try
            {
                var discovered = await _venueDiscoveryService.SearchAsync(
                    query.Latitude, query.Longitude, query.RadiusMeters, promotion.ChainName);

                if (discovered.Count > 0)
                {
                    await _venueCache.UpsertAsync(discovered);
                }

                venues = discovered;
            }
            catch
            {
                // Overpass down/timed out — fall back to whatever's cached
                // (nothing, in this branch) rather than an unhandled error.
            }
        }

        if (venues.Count == 0)
        {
            return [];
        }

        var catalog = await _promotionRepository.GetCollectibleItemsAsync(promotion.Id);
        var catalogById = catalog.ToDictionary(item => item.Id);

        var summaries = await _checkInRepository.GetSummaryByVenueIdsAsync(
            venues.Select(v => v.Id), promotion.Id);

        return venues
            .Select(venue =>
            {
                if (!summaries.TryGetValue(venue.Id, out var summary))
                {
                    return new VenueSummary(venue, CheckInCount: 0, RecentItems: [], LastCheckInAtUtc: null);
                }

                var recentItems = summary.RecentCollectibleItemIds
                    .Where(catalogById.ContainsKey)
                    .Select(id => catalogById[id])
                    .Take(MaxRecentItems)
                    .ToList();

                return new VenueSummary(venue, summary.CheckInCount, recentItems, summary.LastCheckInAtUtc);
            })
            .ToList();
    }
}
