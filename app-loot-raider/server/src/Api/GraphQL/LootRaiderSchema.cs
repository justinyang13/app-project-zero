using GraphQL.Types;
using Microsoft.Extensions.DependencyInjection;

namespace Api.GraphQL;

public sealed class LootRaiderSchema : Schema
{
    public LootRaiderSchema(IServiceProvider serviceProvider)
        : base(serviceProvider)
    {
        Query = serviceProvider.GetRequiredService<Query>();
        Mutation = serviceProvider.GetRequiredService<Mutation>();
    }
}
