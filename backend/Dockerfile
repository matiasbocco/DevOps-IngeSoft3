# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/InventarioApi.csproj backend/
COPY backend.tests/InventarioApi.Tests.csproj backend.tests/
RUN dotnet restore backend/InventarioApi.csproj
RUN dotnet restore backend.tests/InventarioApi.Tests.csproj

COPY backend/ backend/
COPY backend.tests/ backend.tests/
RUN dotnet publish backend/InventarioApi.csproj -c Release -o /app/publish

# Test stage
FROM build AS test
ENTRYPOINT ["dotnet", "test", "backend.tests/InventarioApi.Tests.csproj", \
            "/p:CollectCoverage=true", "/p:Threshold=95", "/p:ThresholdType=line", \
            "/p:CoverletOutputFormat=cobertura", "/p:CoverletOutput=/out/", \
            "/p:Exclude=[InventarioApi]Program%2c[InventarioApi]InventarioApi.Migrations.*", \
            "--logger", "trx;LogFileName=tests.trx", "--results-directory", "/out"]

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "InventarioApi.dll"]
