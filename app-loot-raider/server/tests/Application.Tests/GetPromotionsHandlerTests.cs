using Domain;

namespace Application.Tests;

public class GetPromotionsHandlerTests
{
    [Fact]
    public async Task Handle_ReturnsAllPromotions_NotJustTheActiveOne()
    {
        var active = new Promotion("promo-active", "Active Promo", "McDonald's", new DateOnly(2026, 1, 1), new DateOnly(2026, 12, 31), true);
        var inactive = new Promotion("promo-past", "Past Promo", "McDonald's", new DateOnly(2025, 1, 1), new DateOnly(2025, 12, 31), false);
        var handler = new GetPromotionsHandler(new FakePromotionRepository([active, inactive]));

        var result = await handler.Handle(new GetPromotionsQuery());

        Assert.Equal(2, result.Count);
        Assert.Contains(result, p => p.Id == "promo-active");
        Assert.Contains(result, p => p.Id == "promo-past");
    }

    [Fact]
    public async Task Handle_ReturnsEmpty_WhenNoPromotionsExist()
    {
        var handler = new GetPromotionsHandler(new FakePromotionRepository(null));

        var result = await handler.Handle(new GetPromotionsQuery());

        Assert.Empty(result);
    }
}
