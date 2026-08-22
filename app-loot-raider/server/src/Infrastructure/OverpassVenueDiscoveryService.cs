using System.Globalization;
using System.Text.Json;
using Application;
using Domain;

namespace Infrastructure;

/// <summary>
/// Queries the free, public Overpass API for OpenStreetMap fast-food nodes
/// matching a chain name near a point — no API key, no billing account.
/// </summary>
public sealed class OverpassVenueDiscoveryService : IVenueDiscoveryService
{
    private readonly HttpClient _httpClient;

    public OverpassVenueDiscoveryService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyList<Venue>> SearchAsync(double latitude, double longitude, int radiusMeters, string chainName)
    {
        var query = BuildQuery(latitude, longitude, radiusMeters, chainName);

        using var response = await _httpClient.PostAsync(
            "api/interpreter",
            new FormUrlEncodedContent(new Dictionary<string, string> { ["data"] = query }));

        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var document = await JsonDocument.ParseAsync(stream);

        var venues = new List<Venue>();

        foreach (var element in document.RootElement.GetProperty("elements").EnumerateArray())
        {
            var venue = TryParseElement(element, chainName);
            if (venue is not null)
            {
                venues.Add(venue);
            }
        }

        return venues;
    }

    private static string BuildQuery(double latitude, double longitude, int radiusMeters, string chainName)
    {
        var lat = latitude.ToString(CultureInfo.InvariantCulture);
        var lng = longitude.ToString(CultureInfo.InvariantCulture);
        var escapedChainName = chainName.Replace("\"", "\\\"");

        return $"""
            [out:json][timeout:20];
            node["amenity"="fast_food"]["name"~"{escapedChainName}",i](around:{radiusMeters},{lat},{lng});
            out body;
            """;
    }

    private static Venue? TryParseElement(JsonElement element, string chainName)
    {
        if (!element.TryGetProperty("id", out var idProperty) ||
            !element.TryGetProperty("lat", out var latProperty) ||
            !element.TryGetProperty("lon", out var lonProperty))
        {
            return null;
        }

        var tags = element.TryGetProperty("tags", out var tagsProperty) ? tagsProperty : default;
        var name = TryGetTag(tags, "name") ?? chainName;
        var address = BuildAddress(tags);

        try
        {
            return new Venue(
                id: idProperty.GetInt64().ToString(CultureInfo.InvariantCulture),
                chainName: chainName,
                name: name,
                latitude: latProperty.GetDouble(),
                longitude: lonProperty.GetDouble(),
                address: address);
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    private static string? TryGetTag(JsonElement tags, string key) =>
        tags.ValueKind == JsonValueKind.Object && tags.TryGetProperty(key, out var value)
            ? value.GetString()
            : null;

    private static string BuildAddress(JsonElement tags)
    {
        if (tags.ValueKind != JsonValueKind.Object)
        {
            return string.Empty;
        }

        var parts = new[]
        {
            TryGetTag(tags, "addr:housenumber"),
            TryGetTag(tags, "addr:street"),
            TryGetTag(tags, "addr:city"),
        }.Where(part => !string.IsNullOrWhiteSpace(part));

        return string.Join(" ", parts);
    }
}
