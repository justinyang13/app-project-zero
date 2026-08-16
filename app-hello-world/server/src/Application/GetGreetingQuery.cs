namespace Application;

/// <summary>
/// Represents the intent to fetch the current greeting. Carries no
/// parameters today, but exists so the use case has a named request
/// type independent of any framework or transport.
/// </summary>
public sealed record GetGreetingQuery;
