# syntax=docker/dockerfile:1
#
# Lives at the repo root (not app-hello-world/server/) because Render's
# Docker web service builds with the repo root as context and expects
# ./Dockerfile there.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY app-hello-world/server/Server.slnx .
COPY app-hello-world/server/src/Domain/Domain.csproj app-hello-world/server/src/Domain/
COPY app-hello-world/server/src/Application/Application.csproj app-hello-world/server/src/Application/
COPY app-hello-world/server/src/Infrastructure/Infrastructure.csproj app-hello-world/server/src/Infrastructure/
COPY app-hello-world/server/src/Api/Api.csproj app-hello-world/server/src/Api/
COPY app-hello-world/server/tests/Application.Tests/Application.Tests.csproj app-hello-world/server/tests/Application.Tests/
RUN dotnet restore app-hello-world/server/src/Api/Api.csproj

COPY app-hello-world/server/. app-hello-world/server/
RUN dotnet publish app-hello-world/server/src/Api/Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render (and most PaaS hosts) inject PORT at container *runtime*, not build time,
# so ASPNETCORE_URLS must be expanded in the shell at startup, not baked in above.
ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://+:${PORT} exec dotnet Api.dll"]
