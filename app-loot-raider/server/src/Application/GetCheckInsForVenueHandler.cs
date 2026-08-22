using Domain;

namespace Application;

public sealed class GetCheckInsForVenueHandler
{
    private readonly ICheckInRepository _checkInRepository;

    public GetCheckInsForVenueHandler(ICheckInRepository checkInRepository)
    {
        _checkInRepository = checkInRepository ?? throw new ArgumentNullException(nameof(checkInRepository));
    }

    public Task<IReadOnlyList<CheckIn>> Handle(GetCheckInsForVenueQuery query)
    {
        return _checkInRepository.GetByVenueIdAsync(query.VenueId, query.PromotionId);
    }
}
