using Domain;

namespace Application;

/// <summary>
/// Dependency the Application layer requires but does not implement.
/// Infrastructure provides the concrete (CSV-backed) implementation.
/// </summary>
public interface IPromotionRepository
{
    Task<Promotion?> GetActiveAsync();

    Task<IReadOnlyList<CollectibleItem>> GetCollectibleItemsAsync(string promotionId);
}
