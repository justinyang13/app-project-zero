using Application;
using Domain;

namespace Application.Tests;

public class GetGreetingHandlerTests
{
    [Fact]
    public void Handle_ReturnsGreetingFromProvider()
    {
        var provider = new FakeGreetingProvider(new Greeting("Hello World"));
        var handler = new GetGreetingHandler(provider);

        var result = handler.Handle(new GetGreetingQuery());

        Assert.Equal("Hello World", result.Message);
    }

    [Fact]
    public void Handle_DoesNotAlterProviderResult()
    {
        var provider = new FakeGreetingProvider(new Greeting("Bonjour le monde"));
        var handler = new GetGreetingHandler(provider);

        var result = handler.Handle(new GetGreetingQuery());

        Assert.Equal("Bonjour le monde", result.Message);
    }

    [Fact]
    public void Constructor_ThrowsWhenProviderIsNull()
    {
        Assert.Throws<ArgumentNullException>(() => new GetGreetingHandler(null!));
    }
}
