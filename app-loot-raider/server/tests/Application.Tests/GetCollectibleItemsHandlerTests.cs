using Domain;

namespace Application.Tests;

public class GetCollectibleItemsHandlerTests
{
    [Fact]
    public async Task Handle_ReturnsOnlyItemsForRequestedPromotion()
    {
        var items = new[]
        {
            new CollectibleItem("item-1", "promo-1", "Item One", "", 1),
            new CollectibleItem("item-2", "promo-2", "Item Two", "", 1),
        };
        var handler = new GetCollectibleItemsHandler(new FakePromotionRepository(null, items));

        var result = await handler.Handle(new GetCollectibleItemsQuery("promo-1"));

        var item = Assert.Single(result);
        Assert.Equal("item-1", item.Id);
    }
}
