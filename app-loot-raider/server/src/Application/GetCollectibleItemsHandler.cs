using Domain;

namespace Application;

public sealed class GetCollectibleItemsHandler
{
    private readonly IPromotionRepository _promotionRepository;

    public GetCollectibleItemsHandler(IPromotionRepository promotionRepository)
    {
        _promotionRepository = promotionRepository ?? throw new ArgumentNullException(nameof(promotionRepository));
    }

    public Task<IReadOnlyList<CollectibleItem>> Handle(GetCollectibleItemsQuery query)
    {
        return _promotionRepository.GetCollectibleItemsAsync(query.PromotionId);
    }
}
