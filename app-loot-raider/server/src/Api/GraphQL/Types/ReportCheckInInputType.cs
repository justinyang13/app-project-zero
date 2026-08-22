using GraphQL.Types;

namespace Api.GraphQL.Types;

/// <summary>
/// Plain input DTO for the <c>reportCheckIn</c> mutation. Mapped to
/// <c>Application.ReportCheckInCommand</c> in the Mutation resolver — kept
/// separate so GraphQL-specific shape never leaks into Application.
/// </summary>
public sealed class ReportCheckInInput
{
    public string PromotionId { get; set; } = string.Empty;
    public string CollectibleItemId { get; set; } = string.Empty;
    public string VenueId { get; set; } = string.Empty;
    public string? Nickname { get; set; }
}

public sealed class ReportCheckInInputType : InputObjectGraphType<ReportCheckInInput>
{
    public ReportCheckInInputType()
    {
        Field(x => x.PromotionId, type: typeof(NonNullGraphType<IdGraphType>));
        Field(x => x.CollectibleItemId, type: typeof(NonNullGraphType<IdGraphType>));
        Field(x => x.VenueId, type: typeof(NonNullGraphType<IdGraphType>));
        Field(x => x.Nickname, nullable: true);
    }
}
