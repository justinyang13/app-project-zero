using Application;
using Domain;
using Infrastructure.Csv;

namespace Infrastructure;

public sealed class CsvPromotionRepository : IPromotionRepository
{
    private readonly ICsvTableStore<PromotionRow> _promotions;
    private readonly ICsvTableStore<CollectibleItemRow> _collectibleItems;

    public CsvPromotionRepository(
        ICsvTableStore<PromotionRow> promotions,
        ICsvTableStore<CollectibleItemRow> collectibleItems)
    {
        _promotions = promotions;
        _collectibleItems = collectibleItems;
    }

    public async Task<Promotion?> GetActiveAsync()
    {
        var rows = await _promotions.ReadAllAsync();
        var active = rows.FirstOrDefault(row => row.IsActive);

        return active is null ? null : ToDomain(active);
    }

    public async Task<IReadOnlyList<CollectibleItem>> GetCollectibleItemsAsync(string promotionId)
    {
        var rows = await _collectibleItems.ReadAllAsync();

        return rows
            .Where(row => row.PromotionId == promotionId)
            .OrderBy(row => row.SortOrder)
            .Select(row => new CollectibleItem(row.Id, row.PromotionId, row.Name, row.ImageUrl, row.SortOrder))
            .ToList();
    }

    private static Promotion ToDomain(PromotionRow row) =>
        new(row.Id, row.Name, row.ChainName, row.StartDate, row.EndDate, row.IsActive);
}
