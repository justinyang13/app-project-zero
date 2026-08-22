using Application;
using GraphQL.Types;

namespace Api.GraphQL.Types;

/// <summary>
/// Flattens <see cref="VenueSummary"/> (venue + aggregate check-in data)
/// into one GraphQL object so the client works with a single
/// <c>venuesNear</c> result shape rather than a nested venue field.
/// </summary>
public sealed class VenueSummaryType : ObjectGraphType<VenueSummary>
{
    public VenueSummaryType()
    {
        Field(x => x.Venue.Id, type: typeof(NonNullGraphType<IdGraphType>));
        Field(x => x.Venue.ChainName);
        Field(x => x.Venue.Name);
        Field(x => x.Venue.Latitude);
        Field(x => x.Venue.Longitude);
        Field(x => x.Venue.Address);
        Field(x => x.CheckInCount);
        // Unwrapped (nullable) DateTimeGraphType — a venue with no
        // check-ins yet has no last-check-in time.
        Field(x => x.LastCheckInAtUtc, type: typeof(DateTimeGraphType));
        Field<ListGraphType<CollectibleItemType>>("recentItems")
            .Resolve(ctx => ctx.Source.RecentItems);
    }
}
