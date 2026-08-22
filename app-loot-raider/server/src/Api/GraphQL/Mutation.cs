using Api.GraphQL.Types;
using Application;
using GraphQL.Types;

namespace Api.GraphQL;

public sealed class Mutation : ObjectGraphType
{
    public Mutation(ReportCheckInHandler reportCheckInHandler)
    {
        Field<CheckInType>("reportCheckIn")
            .Description("Reports a spotted collectible at a venue.")
            .Argument<NonNullGraphType<ReportCheckInInputType>>("input")
            .ResolveAsync(async ctx =>
            {
                var input = ctx.GetArgument<ReportCheckInInput>("input");

                return await reportCheckInHandler.Handle(new ReportCheckInCommand(
                    input.PromotionId,
                    input.CollectibleItemId,
                    input.VenueId,
                    input.Nickname));
            });
    }
}
