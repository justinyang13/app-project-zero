using Domain;
using GraphQL.Types;

namespace Api.GraphQL.Types;

public sealed class PromotionType : ObjectGraphType<Promotion>
{
    public PromotionType()
    {
        Field(x => x.Id, type: typeof(NonNullGraphType<IdGraphType>));
        Field(x => x.Name);
        Field(x => x.ChainName);
        Field(x => x.StartDate, type: typeof(NonNullGraphType<DateOnlyGraphType>));
        Field(x => x.EndDate, type: typeof(NonNullGraphType<DateOnlyGraphType>));
        Field(x => x.IsActive);
    }
}
