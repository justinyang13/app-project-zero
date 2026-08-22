using Domain;

namespace Application;

/// <summary>
/// Our own store of venues, populated from <see cref="IVenueDiscoveryService"/>
/// on cache miss so repeat views hit our own store rather than the external
/// venue source every time.
/// </summary>
public interface IVenueCache
{
    Task<IReadOnlyList<Venue>> GetNearAsync(double latitude, double longitude, int radiusMeters, string chainName);

    Task UpsertAsync(IEnumerable<Venue> venues);
}
