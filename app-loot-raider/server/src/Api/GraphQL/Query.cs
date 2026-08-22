using Api.GraphQL.Types;
using Application;
using GraphQL;
using GraphQL.Types;

namespace Api.GraphQL;

/// <summary>
/// Root GraphQL query type. Field resolvers delegate to Application-layer
/// use cases and never contain business logic themselves.
/// </summary>
public sealed class Query : ObjectGraphType
{
    public Query(
        GetActivePromotionHandler getActivePromotionHandler,
        GetCollectibleItemsHandler getCollectibleItemsHandler,
        GetVenuesNearHandler getVenuesNearHandler,
        GetCheckInsForVenueHandler getCheckInsForVenueHandler)
    {
        Field<PromotionType>("activePromotion")
            .Description("The promotion currently shown to visitors.")
            .ResolveAsync(async _ =>
            {
                var promotion = await getActivePromotionHandler.Handle(new GetActivePromotionQuery());
                return promotion ?? throw new ExecutionError("No active promotion right now.");
            });

        Field<ListGraphType<CollectibleItemType>>("collectibleItems")
            .Description("The given promotion's collectible catalog, in display order.")
            .Argument<NonNullGraphType<IdGraphType>>("promotionId")
            .ResolveAsync(async ctx => await getCollectibleItemsHandler.Handle(
                new GetCollectibleItemsQuery(ctx.GetArgument<string>("promotionId"))));

        Field<ListGraphType<VenueSummaryType>>("venuesNear")
            .Description("Venues near a point for the given promotion's chain, with pre-aggregated check-in summaries.")
            .Argument<NonNullGraphType<FloatGraphType>>("lat")
            .Argument<NonNullGraphType<FloatGraphType>>("lng")
            .Argument<NonNullGraphType<IntGraphType>>("radiusMeters")
            .Argument<NonNullGraphType<IdGraphType>>("promotionId")
            .ResolveAsync(async ctx => await getVenuesNearHandler.Handle(new GetVenuesNearQuery(
                ctx.GetArgument<double>("lat"),
                ctx.GetArgument<double>("lng"),
                ctx.GetArgument<int>("radiusMeters"),
                ctx.GetArgument<string>("promotionId"))));

        Field<ListGraphType<CheckInType>>("checkInsForVenue")
            .Description("Full check-in history for one venue, newest first.")
            .Argument<NonNullGraphType<IdGraphType>>("venueId")
            .Argument<NonNullGraphType<IdGraphType>>("promotionId")
            .ResolveAsync(async ctx => await getCheckInsForVenueHandler.Handle(new GetCheckInsForVenueQuery(
                ctx.GetArgument<string>("venueId"),
                ctx.GetArgument<string>("promotionId"))));
    }
}
