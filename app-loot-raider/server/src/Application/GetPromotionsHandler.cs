using Domain;

namespace Application;

/// <summary>
/// Executes the GetPromotionsQuery use case. Depends only on
/// IPromotionRepository, so it can be unit tested without Infrastructure.
/// </summary>
public sealed class GetPromotionsHandler
{
    private readonly IPromotionRepository _promotionRepository;

    public GetPromotionsHandler(IPromotionRepository promotionRepository)
    {
        _promotionRepository = promotionRepository ?? throw new ArgumentNullException(nameof(promotionRepository));
    }

    public Task<IReadOnlyList<Promotion>> Handle(GetPromotionsQuery query)
    {
        return _promotionRepository.GetAllAsync();
    }
}
