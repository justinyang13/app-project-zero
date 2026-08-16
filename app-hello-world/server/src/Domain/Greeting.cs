namespace Domain;

/// <summary>
/// Core domain value object representing a greeting message.
/// Immutable and self-validating: it cannot exist in an invalid state.
/// </summary>
public sealed class Greeting
{
    public string Message { get; }

    public Greeting(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            throw new ArgumentException("Greeting message cannot be null or whitespace.", nameof(message));
        }

        Message = message;
    }

    public override string ToString() => Message;
}
