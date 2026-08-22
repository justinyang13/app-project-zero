using Domain;

namespace Application.Tests;

public class GetActivePromotionHandlerTests
{
    [Fact]
    public async Task Handle_ReturnsActivePromotion()
    {
        var promotion = new Promotion("promo-1", "Test Promo", "McDonald's", new DateOnly(2026, 1, 1), new DateOnly(2026, 12, 31), true);
        var handler = new GetActivePromotionHandler(new FakePromotionRepository(promotion));

        var result = await handler.Handle(new GetActivePromotionQuery());

        Assert.NotNull(result);
        Assert.Equal("promo-1", result!.Id);
    }

    [Fact]
    public async Task Handle_ReturnsNull_WhenNoPromotionIsActive()
    {
        var handler = new GetActivePromotionHandler(new FakePromotionRepository(null));

        var result = await handler.Handle(new GetActivePromotionQuery());

        Assert.Null(result);
    }
}
