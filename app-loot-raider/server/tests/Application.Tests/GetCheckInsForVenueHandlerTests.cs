namespace Application.Tests;

public class GetCheckInsForVenueHandlerTests
{
    [Fact]
    public async Task Handle_ReturnsOnlyCheckInsForRequestedVenueAndPromotion()
    {
        var repository = new FakeCheckInRepository();
        repository.CheckIns.Add(new Domain.CheckIn("checkin-1", "promo-1", "item-1", "venue-1", DateTime.UtcNow));
        repository.CheckIns.Add(new Domain.CheckIn("checkin-2", "promo-1", "item-1", "venue-2", DateTime.UtcNow));
        repository.CheckIns.Add(new Domain.CheckIn("checkin-3", "promo-2", "item-1", "venue-1", DateTime.UtcNow));

        var handler = new GetCheckInsForVenueHandler(repository);

        var result = await handler.Handle(new GetCheckInsForVenueQuery("venue-1", "promo-1"));

        var checkIn = Assert.Single(result);
        Assert.Equal("checkin-1", checkIn.Id);
    }
}
