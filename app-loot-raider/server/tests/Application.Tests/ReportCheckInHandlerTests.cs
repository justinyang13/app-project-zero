using Domain;

namespace Application.Tests;

public class ReportCheckInHandlerTests
{
    private static readonly CollectibleItem[] Catalog =
    [
        new("item-1", "promo-1", "Item One", "", 1),
    ];

    [Fact]
    public async Task Handle_RecordsCheckIn_WhenItemBelongsToPromotion()
    {
        var checkInRepository = new FakeCheckInRepository();
        var handler = new ReportCheckInHandler(checkInRepository, new FakePromotionRepository(null, Catalog));

        var result = await handler.Handle(new ReportCheckInCommand("promo-1", "item-1", "venue-1", "Alex"));

        Assert.Equal("promo-1", result.PromotionId);
        Assert.Equal("item-1", result.CollectibleItemId);
        Assert.Equal("venue-1", result.VenueId);
        Assert.Equal("Alex", result.Nickname);
        Assert.Single(checkInRepository.CheckIns);
    }

    [Fact]
    public async Task Handle_Throws_WhenItemDoesNotBelongToPromotion()
    {
        var checkInRepository = new FakeCheckInRepository();
        var handler = new ReportCheckInHandler(checkInRepository, new FakePromotionRepository(null, Catalog));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new ReportCheckInCommand("promo-1", "item-does-not-exist", "venue-1", null)));

        Assert.Empty(checkInRepository.CheckIns);
    }

    [Fact]
    public async Task Handle_DefaultsReportedAtUtc_ToNow_WhenNotSupplied()
    {
        var checkInRepository = new FakeCheckInRepository();
        var handler = new ReportCheckInHandler(checkInRepository, new FakePromotionRepository(null, Catalog));

        var before = DateTime.UtcNow;
        var result = await handler.Handle(new ReportCheckInCommand("promo-1", "item-1", "venue-1", null));
        var after = DateTime.UtcNow;

        Assert.InRange(result.ReportedAtUtc, before, after);
    }

    [Fact]
    public async Task Handle_HonorsClientSuppliedReportedAtUtc_WhenWithinToday()
    {
        var checkInRepository = new FakeCheckInRepository();
        var handler = new ReportCheckInHandler(checkInRepository, new FakePromotionRepository(null, Catalog));

        var earlierToday = DateTime.UtcNow.AddHours(-2);
        var result = await handler.Handle(
            new ReportCheckInCommand("promo-1", "item-1", "venue-1", null, earlierToday));

        Assert.Equal(earlierToday, result.ReportedAtUtc);
    }

    [Fact]
    public async Task Handle_ClampsReportedAtUtc_ToNow_WhenSuppliedValueIsNotToday()
    {
        var checkInRepository = new FakeCheckInRepository();
        var handler = new ReportCheckInHandler(checkInRepository, new FakePromotionRepository(null, Catalog));

        var lastWeek = DateTime.UtcNow.AddDays(-7);
        var before = DateTime.UtcNow;
        var result = await handler.Handle(
            new ReportCheckInCommand("promo-1", "item-1", "venue-1", null, lastWeek));
        var after = DateTime.UtcNow;

        Assert.InRange(result.ReportedAtUtc, before, after);
    }
}
