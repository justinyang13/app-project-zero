using Application;
using Domain;

namespace Application.Tests;

/// <summary>
/// Minimal test double for IGreetingProvider. A hand-rolled fake is enough
/// here, so the test project has no need for a mocking library.
/// </summary>
internal sealed class FakeGreetingProvider : IGreetingProvider
{
    private readonly Greeting _greeting;

    public FakeGreetingProvider(Greeting greeting)
    {
        _greeting = greeting;
    }

    public Greeting GetGreeting() => _greeting;
}
