using Domain;

namespace Application;

/// <summary>
/// Executes the GetActivePromotionQuery use case (UC-1). Depends only on
/// IPromotionRepository, so it can be unit tested without Infrastructure.
/// </summary>
public sealed class GetActivePromotionHandler
{
    private readonly IPromotionRepository _promotionRepository;

    public GetActivePromotionHandler(IPromotionRepository promotionRepository)
    {
        _promotionRepository = promotionRepository ?? throw new ArgumentNullException(nameof(promotionRepository));
    }

    /// <returns>
    /// The active promotion, or <c>null</c> when none is active — the Api
    /// layer surfaces this as the "no active hunt" holding state (UC-1).
    /// </returns>
    public Task<Promotion?> Handle(GetActivePromotionQuery query)
    {
        return _promotionRepository.GetActiveAsync();
    }
}
