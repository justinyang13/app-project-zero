namespace Domain;

/// <summary>
/// A real-world location tied to a promotion's chain, sourced from
/// OpenStreetMap and cached locally. <see cref="Id"/> is the OSM node id.
/// </summary>
public sealed class Venue
{
    public string Id { get; }
    public string ChainName { get; }
    public string Name { get; }
    public double Latitude { get; }
    public double Longitude { get; }
    public string Address { get; }

    public Venue(
        string id,
        string chainName,
        string name,
        double latitude,
        double longitude,
        string address)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ArgumentException("Venue id cannot be null or whitespace.", nameof(id));
        }

        if (string.IsNullOrWhiteSpace(chainName))
        {
            throw new ArgumentException("Venue chain name cannot be null or whitespace.", nameof(chainName));
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Venue name cannot be null or whitespace.", nameof(name));
        }

        if (latitude is < -90 or > 90)
        {
            throw new ArgumentOutOfRangeException(nameof(latitude), latitude, "Latitude must be between -90 and 90.");
        }

        if (longitude is < -180 or > 180)
        {
            throw new ArgumentOutOfRangeException(nameof(longitude), longitude, "Longitude must be between -180 and 180.");
        }

        Id = id;
        ChainName = chainName;
        Name = name;
        Latitude = latitude;
        Longitude = longitude;
        Address = address ?? string.Empty;
    }
}
