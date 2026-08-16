using GraphQL.Types;
using Microsoft.Extensions.DependencyInjection;

namespace Api.GraphQL;

public sealed class GreetingSchema : Schema
{
    public GreetingSchema(IServiceProvider serviceProvider)
        : base(serviceProvider)
    {
        Query = serviceProvider.GetRequiredService<Query>();
    }
}
