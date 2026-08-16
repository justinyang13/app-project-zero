# syntax=docker/dockerfile:1
#
# Lives at the repo root (not server/) because Render's Docker web service
# builds with the repo root as context and expects ./Dockerfile there.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY server/Server.slnx .
COPY server/src/Domain/Domain.csproj server/src/Domain/
COPY server/src/Application/Application.csproj server/src/Application/
COPY server/src/Infrastructure/Infrastructure.csproj server/src/Infrastructure/
COPY server/src/Api/Api.csproj server/src/Api/
COPY server/tests/Application.Tests/Application.Tests.csproj server/tests/Application.Tests/
RUN dotnet restore server/src/Api/Api.csproj

COPY server/. server/
RUN dotnet publish server/src/Api/Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render (and most PaaS hosts) inject PORT at container *runtime*, not build time,
# so ASPNETCORE_URLS must be expanded in the shell at startup, not baked in above.
ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://+:${PORT} exec dotnet Api.dll"]
