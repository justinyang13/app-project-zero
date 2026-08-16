using Application;
using Domain;

namespace Infrastructure;

/// <summary>
/// Concrete source of the greeting. Stands in for whatever a real
/// project would use here (database, config, external service) —
/// the Application layer only ever sees it through IGreetingProvider.
/// </summary>
public sealed class GreetingProvider : IGreetingProvider
{
    public Greeting GetGreeting() => new("Hello World");
}
