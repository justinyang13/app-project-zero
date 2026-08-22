using Domain;

namespace Application.Tests;

public class GetVenuesNearHandlerTests
{
    private static readonly Promotion Promotion =
        new("promo-1", "Test Promo", "McDonald's", new DateOnly(2026, 1, 1), new DateOnly(2026, 12, 31), true);

    private static readonly CollectibleItem[] Catalog =
    [
        new("item-1", "promo-1", "Item One", "", 1),
    ];

    [Fact]
    public async Task Handle_ReturnsEmpty_WhenNoPromotionIsActive()
    {
        var handler = new GetVenuesNearHandler(
            new FakePromotionRepository(null),
            new FakeVenueCache(),
            new FakeVenueDiscoveryService([]),
            new FakeCheckInRepository());

        var result = await handler.Handle(new GetVenuesNearQuery(0, 0, 1000, "promo-1"));

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_UsesCachedVenues_WithoutCallingDiscovery_WhenCacheHasResults()
    {
        var venueCache = new FakeVenueCache();
        venueCache.Venues.Add(new Venue("venue-1", "McDonald's", "Test Venue", 0, 0, ""));
        var discovery = new FakeVenueDiscoveryService(new Exception("should not be called"));

        var handler = new GetVenuesNearHandler(
            new FakePromotionRepository(Promotion, Catalog),
            venueCache,
            discovery,
            new FakeCheckInRepository());

        var result = await handler.Handle(new GetVenuesNearQuery(0, 0, 1000, "promo-1"));

        var summary = Assert.Single(result);
        Assert.Equal("venue-1", summary.Venue.Id);
        Assert.Equal(0, summary.CheckInCount);
    }

    [Fact]
    public async Task Handle_FallsBackToDiscovery_WhenCacheIsEmpty()
    {
        var discovered = new[] { new Venue("venue-1", "McDonald's", "Test Venue", 0, 0, "") };
        var venueCache = new FakeVenueCache();

        var handler = new GetVenuesNearHandler(
            new FakePromotionRepository(Promotion, Catalog),
            venueCache,
            new FakeVenueDiscoveryService(discovered),
            new FakeCheckInRepository());

        var result = await handler.Handle(new GetVenuesNearQuery(0, 0, 1000, "promo-1"));

        Assert.Single(result);
        Assert.Single(venueCache.Venues);
    }

    [Fact]
    public async Task Handle_ReturnsEmpty_WhenDiscoveryFailsAndCacheIsEmpty()
    {
        var handler = new GetVenuesNearHandler(
            new FakePromotionRepository(Promotion, Catalog),
            new FakeVenueCache(),
            new FakeVenueDiscoveryService(new HttpRequestException("Overpass is down")),
            new FakeCheckInRepository());

        var result = await handler.Handle(new GetVenuesNearQuery(0, 0, 1000, "promo-1"));

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_IncludesCheckInSummary_ForVenuesWithCheckIns()
    {
        var venueCache = new FakeVenueCache();
        venueCache.Venues.Add(new Venue("venue-1", "McDonald's", "Test Venue", 0, 0, ""));
        var checkInRepository = new FakeCheckInRepository();
        var reportedAt = DateTime.UtcNow;
        checkInRepository.CheckIns.Add(new CheckIn("checkin-1", "promo-1", "item-1", "venue-1", reportedAt));

        var handler = new GetVenuesNearHandler(
            new FakePromotionRepository(Promotion, Catalog),
            venueCache,
            new FakeVenueDiscoveryService([]),
            checkInRepository);

        var result = await handler.Handle(new GetVenuesNearQuery(0, 0, 1000, "promo-1"));

        var summary = Assert.Single(result);
        Assert.Equal(1, summary.CheckInCount);
        Assert.Equal(reportedAt, summary.LastCheckInAtUtc);
        var recentItem = Assert.Single(summary.RecentItems);
        Assert.Equal("item-1", recentItem.Id);
    }
}
