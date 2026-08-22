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
            reportedAtUtc: ResolveReportedAtUtc(command.ReportedAtUtc),
            nickname: command.Nickname);

        return await _checkInRepository.AddAsync(checkIn);
    }

    /// <summary>
    /// The client picks the time-of-day but not the date — this clamps
    /// whatever it sends back to "now" if it's outside a generous same-day
    /// window, so the recorded date is always today regardless of what a
    /// stale/tampered client sends. Not exact calendar-day equality, since
    /// that would need the visitor's timezone, which we don't have.
    /// </summary>
    private static DateTime ResolveReportedAtUtc(DateTime? requested)
    {
        var now = DateTime.UtcNow;

        if (requested is null)
        {
            return now;
        }

        var value = requested.Value;
        return value > now.AddMinutes(5) || value < now.AddHours(-24) ? now : value;
    }
}
