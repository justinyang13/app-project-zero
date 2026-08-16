using Application;
using GraphQL.Types;

namespace Api.GraphQL;

/// <summary>
/// Root GraphQL query type. Field resolvers delegate to Application-layer
/// use cases and never contain business logic themselves.
/// </summary>
public sealed class Query : ObjectGraphType
{
    public Query(GetGreetingHandler getGreetingHandler)
    {
        Field<NonNullGraphType<StringGraphType>>("hello")
            .Description("Returns the application's greeting.")
            .Resolve(_ => getGreetingHandler.Handle(new GetGreetingQuery()).Message);
    }
}
