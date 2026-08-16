using Api.GraphQL;
using Application;
using GraphQL;
using Infrastructure;
using Microsoft.Extensions.DependencyInjection;

const string CorsPolicyName = "ClientOrigins";

var builder = WebApplication.CreateBuilder(args);

// Application layer use case and its Infrastructure dependency.
builder.Services.AddScoped<IGreetingProvider, GreetingProvider>();
builder.Services.AddScoped<GetGreetingHandler>();

// GraphQL.NET schema + ASP.NET Core transport.
builder.Services.AddScoped<Query>();
builder.Services.AddGraphQL(graphQL => graphQL
    .AddSchema<GreetingSchema>(GraphQL.DI.ServiceLifetime.Scoped)
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
app.UseGraphQL("/graphql");

app.MapGet("/", () => Results.Ok("Server.Api is running. POST GraphQL queries to /graphql."));

app.Run();
