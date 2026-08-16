using Domain;

namespace Application;

/// <summary>
/// Executes the GetGreetingQuery use case. Depends only on the
/// IGreetingProvider abstraction, so it can be unit tested without
/// Infrastructure or Api.
/// </summary>
public sealed class GetGreetingHandler
{
    private readonly IGreetingProvider _greetingProvider;

    public GetGreetingHandler(IGreetingProvider greetingProvider)
    {
        _greetingProvider = greetingProvider ?? throw new ArgumentNullException(nameof(greetingProvider));
    }

    public Greeting Handle(GetGreetingQuery query)
    {
        return _greetingProvider.GetGreeting();
    }
}
