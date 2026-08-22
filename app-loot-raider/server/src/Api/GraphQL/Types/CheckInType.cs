using Domain;
using GraphQL.Types;

namespace Api.GraphQL.Types;

public sealed class CheckInType : ObjectGraphType<CheckIn>
{
    public CheckInType()
    {
        Field(x => x.Id, type: typeof(NonNullGraphType<IdGraphType>));
        Field(x => x.CollectibleItemId, type: typeof(NonNullGraphType<IdGraphType>));
        Field(x => x.VenueId, type: typeof(NonNullGraphType<IdGraphType>));
        Field(x => x.ReportedAtUtc, type: typeof(NonNullGraphType<DateTimeGraphType>));
        Field(x => x.Nickname, nullable: true);
    }
}
