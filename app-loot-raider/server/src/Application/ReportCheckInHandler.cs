using Domain;

namespace Application;

/// <summary>
/// Executes the ReportCheckInCommand use case (UC-6). Confirms the
/// collectible actually belongs to the promotion's catalog before
/// recording the check-in, so a stale/tampered client can't record
/// check-ins against items outside the active promotion.
/// </summary>
public sealed class ReportCheckInHandler
{
    private readonly ICheckInRepository _checkInRepository;
    private readonly IPromotionRepository _promotionRepository;

    public ReportCheckInHandler(ICheckInRepository checkInRepository, IPromotionRepository promotionRepository)
    {
        _checkInRepository = checkInRepository ?? throw new ArgumentNullException(nameof(checkInRepository));
        _promotionRepository = promotionRepository ?? throw new ArgumentNullException(nameof(promotionRepository));
    }

    public async Task<CheckIn> Handle(ReportCheckInCommand command)
    {
        var catalog = await _promotionRepository.GetCollectibleItemsAsync(command.PromotionId);
        var itemExists = catalog.Any(item => item.Id == command.CollectibleItemId);

        if (!itemExists)
        {
            throw new InvalidOperationException(
                $"Collectible item '{command.CollectibleItemId}' is not part of promotion '{command.PromotionId}'.");
        }

        var checkIn = new CheckIn(
            id: Guid.NewGuid().ToString(),
            promotionId: command.PromotionId,
            collectibleItemId: command.CollectibleItemId,
            venueId: command.VenueId,
            reportedAtUtc: DateTime.UtcNow,
            nickname: command.Nickname);

        return await _checkInRepository.AddAsync(checkIn);
    }
}
