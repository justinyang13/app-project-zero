using System.Net.Http.Headers;
using System.Threading.RateLimiting;
using Api.GraphQL;
using Application;
using GraphQL;
using Infrastructure;
using Infrastructure.Csv;
using Microsoft.Extensions.DependencyInjection;

const string CorsPolicyName = "ClientOrigins";

var builder = WebApplication.CreateBuilder(args);

// Application layer use case handlers.
builder.Services.AddScoped<GetActivePromotionHandler>();
builder.Services.AddScoped<GetCollectibleItemsHandler>();
builder.Services.AddScoped<GetVenuesNearHandler>();
builder.Services.AddScoped<GetCheckInsForVenueHandler>();
builder.Services.AddScoped<ReportCheckInHandler>();

// Repositories — CSV-backed today; swapping to a real DB later means one
// new Infrastructure class per interface and flipping these three lines.
builder.Services.AddScoped<IPromotionRepository, CsvPromotionRepository>();
builder.Services.AddScoped<IVenueCache, CsvVenueRepository>();
builder.Services.AddScoped<ICheckInRepository, CsvCheckInRepository>();

// External venue discovery — the free, public Overpass API, no API key.
builder.Services.AddHttpClient<IVenueDiscoveryService, OverpassVenueDiscoveryService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Overpass:BaseUrl"] ?? "https://overpass-api.de/");
    client.Timeout = TimeSpan.FromSeconds(20);
});

// CSV table stores. LocalFile for dev; GitHubGist in production, because
// Render's free tier wipes local disk on every restart/spin-down.
var persistenceProvider = builder.Configuration["Persistence:Provider"] ?? "LocalFile";

if (string.Equals(persistenceProvider, "GitHubGist", StringComparison.OrdinalIgnoreCase))
{
    var gistId = builder.Configuration["GITHUB_GIST_ID"]
        ?? throw new InvalidOperationException("GITHUB_GIST_ID is required when Persistence:Provider is GitHubGist.");
    var gistToken = builder.Configuration["GITHUB_GIST_TOKEN"]
        ?? throw new InvalidOperationException("GITHUB_GIST_TOKEN is required when Persistence:Provider is GitHubGist.");

    builder.Services.AddHttpClient("GitHubGist", client =>
    {
        client.BaseAddress = new Uri("https://api.github.com/");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", gistToken);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("app-loot-raider");
        client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
    });

    RegisterGistStore<PromotionRow>(builder.Services, gistId, "promotions.csv");
    RegisterGistStore<CollectibleItemRow>(builder.Services, gistId, "collectible_items.csv");
    RegisterGistStore<VenueRow>(builder.Services, gistId, "venues.csv");
    RegisterGistStore<CheckInRow>(builder.Services, gistId, "checkins.csv");
}
else
{
    var localDataDirectory = builder.Configuration["Persistence:LocalDataDirectory"]
        ?? ResolveDefaultDataDirectory(builder.Environment.ContentRootPath);

    builder.Services.AddSingleton<ICsvTableStore<PromotionRow>>(
        _ => new LocalFileCsvTableStore<PromotionRow>(Path.Combine(localDataDirectory, "promotions.csv")));
    builder.Services.AddSingleton<ICsvTableStore<CollectibleItemRow>>(
        _ => new LocalFileCsvTableStore<CollectibleItemRow>(Path.Combine(localDataDirectory, "collectible_items.csv")));
    builder.Services.AddSingleton<ICsvTableStore<VenueRow>>(
        _ => new LocalFileCsvTableStore<VenueRow>(Path.Combine(localDataDirectory, "venues.csv")));
    builder.Services.AddSingleton<ICsvTableStore<CheckInRow>>(
        _ => new LocalFileCsvTableStore<CheckInRow>(Path.Combine(localDataDirectory, "checkins.csv")));
}

// Basic per-IP rate limiting, applied to the whole /graphql endpoint since
// GraphQL multiplexes every query and mutation over one route — hobby-scale
// spam friction for reportCheckIn, not fine-grained per-operation limiting.
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// GraphQL.NET schema + ASP.NET Core transport.
builder.Services.AddScoped<Query>();
builder.Services.AddScoped<Mutation>();
builder.Services.AddGraphQL(graphQL => graphQL
    .AddSchema<LootRaiderSchema>(GraphQL.DI.ServiceLifetime.Scoped)
    .AddSystemTextJson()
    .AddGraphTypes(typeof(Query).Assembly));

// The client origin(s) allowed to call this API, driven entirely by config
// (appsettings, environment variables, or a Render env var) — never hardcoded.
var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(cors => cors.AddPolicy(CorsPolicyName, policy =>
{
    if (allowedOrigins.Length > 0)
    {
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
    }
    else
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    }
}));

var app = builder.Build();

app.UseCors(CorsPolicyName);
app.UseRateLimiter();
app.UseGraphQL("/graphql");

app.MapGet("/", () => Results.Ok("Server.Api is running. POST GraphQL queries to /graphql."));

app.Run();

static void RegisterGistStore<T>(IServiceCollection services, string gistId, string fileName)
{
    services.AddSingleton<ICsvTableStore<T>>(sp =>
    {
        var httpClient = sp.GetRequiredService<IHttpClientFactory>().CreateClient("GitHubGist");
        return new GitHubGistCsvTableStore<T>(httpClient, gistId, fileName);
    });
}

static string ResolveDefaultDataDirectory(string contentRootPath)
{
    // Docker image layout: data/ is copied alongside the published Api.dll
    // (see server/Dockerfile), so content root and data are siblings.
    var sibling = Path.Combine(contentRootPath, "data");
    if (Directory.Exists(sibling))
    {
        return sibling;
    }

    // `dotnet run --project src/Api` layout: content root is server/src/Api,
    // and data/ lives at the server project root, two levels up.
    return Path.Combine(contentRootPath, "..", "..", "data");
}
