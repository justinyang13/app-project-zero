using Domain;

namespace Application;

/// <summary>
/// Dependency the Application layer requires but does not implement.
/// Infrastructure provides the concrete implementation.
/// </summary>
public interface IGreetingProvider
{
    Greeting GetGreeting();
}
