using Domain;

namespace Application;

/// <summary>
/// External venue source (Overpass/OpenStreetMap in Infrastructure), used
/// to refresh <see cref="IVenueCache"/> on a miss.
/// </summary>
public interface IVenueDiscoveryService
{
    Task<IReadOnlyList<Venue>> SearchAsync(double latitude, double longitude, int radiusMeters, string chainName);
}
