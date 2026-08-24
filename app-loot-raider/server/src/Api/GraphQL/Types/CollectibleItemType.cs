using Domain;
using GraphQL.Types;

namespace Api.GraphQL.Types;

public sealed class CollectibleItemType : ObjectGraphType<CollectibleItem>
{
    public CollectibleItemType()
    {
        Field(x => x.Id, type: typeof(NonNullGraphType<IdGraphType>));
        Field(x => x.Name);
        Field(x => x.ImageUrl);
        Field(x => x.SortOrder, type: typeof(NonNullGraphType<IntGraphType>)).Description(
            "The item's position in the collection lineup (1-indexed), e.g. \"#3\" in \"#3 My Melody x Mothra\".");
    }
}
