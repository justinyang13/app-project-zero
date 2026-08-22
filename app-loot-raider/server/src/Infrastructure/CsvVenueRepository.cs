using Application;
using Domain;
using Infrastructure.Csv;

namespace Infrastructure;

/// <summary>
/// CSV-backed <see cref="IVenueCache"/>. Distance filtering is done
/// in-memory with the haversine formula — fine at the row counts a
/// CSV-backed store is meant for.
/// </summary>
public sealed class CsvVenueRepository : IVenueCache
{
    private const double EarthRadiusMeters = 6_371_000;

    private readonly ICsvTableStore<VenueRow> _venues;

    public CsvVenueRepository(ICsvTableStore<VenueRow> venues)
    {
        _venues = venues;
    }

    public async Task<IReadOnlyList<Venue>> GetNearAsync(double latitude, double longitude, int radiusMeters, string chainName)
    {
        var rows = await _venues.ReadAllAsync();

        return rows
            .Where(row => row.ChainName == chainName)
            .Where(row => DistanceMeters(latitude, longitude, row.Latitude, row.Longitude) <= radiusMeters)
            .Select(ToDomain)
            .ToList();
    }

    public async Task UpsertAsync(IEnumerable<Venue> venues)
    {
        var incoming = venues.ToList();
        if (incoming.Count == 0)
        {
            return;
        }

        var existing = (await _venues.ReadAllAsync()).ToDictionary(row => row.Id);

        foreach (var venue in incoming)
        {
            existing[venue.Id] = ToRow(venue);
        }

        await _venues.WriteAllAsync(existing.Values);
    }

    private static double DistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLon = DegreesToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(lat1)) * Math.Cos(DegreesToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return EarthRadiusMeters * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180;

    private static Venue ToDomain(VenueRow row) =>
        new(row.Id, row.ChainName, row.Name, row.Latitude, row.Longitude, row.Address);

    private static VenueRow ToRow(Venue venue) => new()
    {
        Id = venue.Id,
        ChainName = venue.ChainName,
        Name = venue.Name,
        Latitude = venue.Latitude,
        Longitude = venue.Longitude,
        Address = venue.Address,
    };
}
