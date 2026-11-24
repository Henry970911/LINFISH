FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY LinfishAppcation.csproj ./
RUN dotnet restore LinfishAppcation.csproj
COPY . ./
RUN dotnet publish LinfishAppcation.csproj -c Release --no-restore -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
USER $APP_UID
ENTRYPOINT ["dotnet", "LinfishAppcation.dll"]
