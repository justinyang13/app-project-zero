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
    }
}
